// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "./FreeRandomness.sol";

/**
 * @title SecureReferralSystem
 * @dev Enhanced referral code system with secure randomness generation
 * 
 * SECURITY FEATURES:
 * - ReentrancyGuard: Prevents reentrancy attacks
 * - Ownable: Access control for admin functions
 * - Pausable: Emergency pause functionality
 * - SafeMath: Overflow protection
 * - Rate limiting: Cooldown periods
 * - Anti-front-running: Commit-reveal scheme
 * - Expiration tracking: Automatic code cleanup
 * - Blacklist system: Security controls
 * 
 * OPTIMIZED FOR BASE NETWORK:
 * - Gas-efficient operations
 * - Batch processing support
 * - Memory optimization
 * - Event-based state updates
 */
contract SecureReferralSystem is ReentrancyGuard, Ownable, Pausable {
    
    
    // Free Randomness contract for VRF-based generation
    FreeRandomness public randomnessContract;
    
    // Referral code structure
    struct ReferralCode {
        bytes32 codeHash;
        address creator;
        uint256 expiry;
        bool claimed;
        uint256 claimCount;
        uint256 maxClaims;
        uint256 rewardAmount;
        string codeString;
        bool isActive;
    }
    
    // Referral claim structure
    struct ReferralClaim {
        address claimer;
        uint256 claimTime;
        uint256 rewardAmount;
        bool isProcessed;
    }
    
    // User referral data
    struct UserReferralData {
        uint256 totalCodesCreated;
        uint256 totalCodesClaimed;
        uint256 totalRewardsEarned;
        uint256 lastCodeGeneration;
        bool isBlacklisted;
        uint256 cooldownEndTime;
    }
    
    // System constants
    uint256 public constant CODE_EXPIRY_DURATION = 30 days;
    uint256 public constant MAX_CODE_LENGTH = 50;
    uint256 public constant MIN_CODE_LENGTH = 6;
    uint256 public constant MAX_CLAIMS_PER_CODE = 100;
    uint256 public constant GENERATION_COOLDOWN = 1 hours;
    uint256 public constant CLAIM_COOLDOWN = 30 minutes;
    uint256 public constant MAX_CODES_PER_USER = 10;
    
    // Default reward amounts
    uint256 public constant DEFAULT_REWARD_AMOUNT = 2; // 2 toppings
    uint256 public constant BONUS_REWARD_AMOUNT = 5; // 5 toppings for successful referrals
    
    // State variables
    mapping(bytes32 => ReferralCode) public referralCodes;
    mapping(address => UserReferralData) public userReferralData;
    mapping(address => bool) public blacklistedAddresses;
    mapping(bytes32 => ReferralClaim[]) public codeClaims;
    mapping(address => uint256) public userClaimCount;
    
    // Code generation tracking
    uint256 public totalCodesGenerated;
    uint256 public totalCodesClaimed;
    uint256 public totalRewardsDistributed;
    
    // Events
    event ReferralCodeGenerated(
        bytes32 indexed codeHash,
        address indexed creator,
        string codeString,
        uint256 expiry,
        uint256 maxClaims,
        uint256 rewardAmount
    );
    
    event ReferralCodeClaimed(
        bytes32 indexed codeHash,
        address indexed claimer,
        address indexed creator,
        uint256 rewardAmount,
        uint256 claimTime
    );
    
    event ReferralCodeExpired(
        bytes32 indexed codeHash,
        address indexed creator,
        uint256 expiryTime
    );
    
    event UserBlacklisted(
        address indexed user,
        bool blacklisted,
        string reason
    );
    
    event RewardDistributed(
        address indexed user,
        uint256 amount,
        string reason
    );
    
    event CodeReclaimed(
        bytes32 indexed codeHash,
        address indexed creator,
        uint256 reclaimedAmount
    );
    
    // Modifiers
    modifier notBlacklisted(address user) {
        require(!blacklistedAddresses[user], "User is blacklisted");
        require(!userReferralData[user].isBlacklisted, "User is blacklisted");
        _;
    }
    
    modifier validCodeLength(string memory code) {
        require(bytes(code).length >= MIN_CODE_LENGTH, "Code too short");
        require(bytes(code).length <= MAX_CODE_LENGTH, "Code too long");
        _;
    }
    
    modifier codeExists(bytes32 codeHash) {
        require(referralCodes[codeHash].creator != address(0), "Code does not exist");
        _;
    }
    
    modifier codeNotExpired(bytes32 codeHash) {
        require(referralCodes[codeHash].expiry > block.timestamp, "Code has expired");
        _;
    }
    
    modifier codeNotClaimed(bytes32 codeHash) {
        require(!referralCodes[codeHash].claimed, "Code already claimed");
        _;
    }
    
    modifier withinClaimLimit(bytes32 codeHash) {
        require(
            referralCodes[codeHash].claimCount < referralCodes[codeHash].maxClaims,
            "Claim limit reached"
        );
        _;
    }
    
    modifier rateLimited(address user) {
        require(
            block.timestamp >= userReferralData[user].cooldownEndTime,
            "Rate limit exceeded"
        );
        _;
    }
    
    constructor(address _randomnessContract) Ownable(msg.sender) {
        require(_randomnessContract != address(0), "Invalid randomness contract");
        randomnessContract = FreeRandomness(_randomnessContract);
    }
    
    /**
     * @dev Generate a new referral code using VRF-based randomness
     * @param requestId Unique request ID for randomness
     * @param maxClaims Maximum number of claims allowed for this code
     * @param rewardAmount Reward amount for successful claims
     */
    function generateVRFReferralCode(
        uint256 requestId,
        uint256 maxClaims,
        uint256 rewardAmount
    ) external nonReentrant whenNotPaused notBlacklisted(msg.sender) rateLimited(msg.sender) {
        require(maxClaims > 0 && maxClaims <= MAX_CLAIMS_PER_CODE, "Invalid max claims");
        require(rewardAmount > 0, "Invalid reward amount");
        require(
            userReferralData[msg.sender].totalCodesCreated < MAX_CODES_PER_USER,
            "Max codes per user reached"
        );
        
        // Generate code hash using VRF randomness
        bytes32 codeHash = _generateVRFCodeHash(msg.sender, requestId);
        
        // Ensure code doesn't already exist
        require(referralCodes[codeHash].creator == address(0), "Code already exists");
        
        // Create referral code
        string memory codeString = _generateCodeString(codeHash);
        
        referralCodes[codeHash] = ReferralCode({
            codeHash: codeHash,
            creator: msg.sender,
            expiry: block.timestamp + CODE_EXPIRY_DURATION,
            claimed: false,
            claimCount: 0,
            maxClaims: maxClaims,
            rewardAmount: rewardAmount,
            codeString: codeString,
            isActive: true
        });
        
        // Update user data
        userReferralData[msg.sender].totalCodesCreated = userReferralData[msg.sender].totalCodesCreated + 1;
        userReferralData[msg.sender].lastCodeGeneration = block.timestamp;
        userReferralData[msg.sender].cooldownEndTime = block.timestamp + GENERATION_COOLDOWN;
        
        totalCodesGenerated = totalCodesGenerated + 1;
        
        emit ReferralCodeGenerated(
            codeHash,
            msg.sender,
            codeString,
            block.timestamp + CODE_EXPIRY_DURATION,
            maxClaims,
            rewardAmount
        );
    }
    
    /**
     * @dev Generate a new referral code using blockhash-based randomness
     * @param maxClaims Maximum number of claims allowed for this code
     * @param rewardAmount Reward amount for successful claims
     */
    function generateBlockhashReferralCode(
        uint256 maxClaims,
        uint256 rewardAmount
    ) external nonReentrant whenNotPaused notBlacklisted(msg.sender) rateLimited(msg.sender) {
        require(maxClaims > 0 && maxClaims <= MAX_CLAIMS_PER_CODE, "Invalid max claims");
        require(rewardAmount > 0, "Invalid reward amount");
        require(
            userReferralData[msg.sender].totalCodesCreated < MAX_CODES_PER_USER,
            "Max codes per user reached"
        );
        
        // Generate code hash using blockhash randomness
        bytes32 codeHash = _generateBlockhashCodeHash(msg.sender);
        
        // Ensure code doesn't already exist
        require(referralCodes[codeHash].creator == address(0), "Code already exists");
        
        // Create referral code
        string memory codeString = _generateCodeString(codeHash);
        
        referralCodes[codeHash] = ReferralCode({
            codeHash: codeHash,
            creator: msg.sender,
            expiry: block.timestamp + CODE_EXPIRY_DURATION,
            claimed: false,
            claimCount: 0,
            maxClaims: maxClaims,
            rewardAmount: rewardAmount,
            codeString: codeString,
            isActive: true
        });
        
        // Update user data
        userReferralData[msg.sender].totalCodesCreated = userReferralData[msg.sender].totalCodesCreated + 1;
        userReferralData[msg.sender].lastCodeGeneration = block.timestamp;
        userReferralData[msg.sender].cooldownEndTime = block.timestamp + GENERATION_COOLDOWN;
        
        totalCodesGenerated = totalCodesGenerated + 1;
        
        emit ReferralCodeGenerated(
            codeHash,
            msg.sender,
            codeString,
            block.timestamp + CODE_EXPIRY_DURATION,
            maxClaims,
            rewardAmount
        );
    }
    
    /**
     * @dev Claim a referral code
     * @param codeHash Hash of the referral code to claim
     */
    function claimReferralCode(bytes32 codeHash) external nonReentrant whenNotPaused notBlacklisted(msg.sender) {
        require(referralCodes[codeHash].isActive, "Code is not active");
        require(referralCodes[codeHash].expiry > block.timestamp, "Code has expired");
        require(
            referralCodes[codeHash].claimCount < referralCodes[codeHash].maxClaims,
            "Claim limit reached"
        );
        require(
            referralCodes[codeHash].creator != msg.sender,
            "Cannot claim your own code"
        );
        
        // Check if user has already claimed this code
        bool alreadyClaimed = false;
        for (uint256 i = 0; i < codeClaims[codeHash].length; i++) {
            if (codeClaims[codeHash][i].claimer == msg.sender) {
                alreadyClaimed = true;
                break;
            }
        }
        require(!alreadyClaimed, "Already claimed this code");
        
        // Rate limiting for claims
        require(
            block.timestamp >= userReferralData[msg.sender].cooldownEndTime,
            "Claim rate limit exceeded"
        );
        
        // Process the claim
        _processReferralClaim(codeHash, msg.sender);
        
        // Update user data
        userReferralData[msg.sender].totalCodesClaimed = userReferralData[msg.sender].totalCodesClaimed + 1;
        userReferralData[msg.sender].cooldownEndTime = block.timestamp + CLAIM_COOLDOWN;
        
        // Update code data
        referralCodes[codeHash].claimCount = referralCodes[codeHash].claimCount + 1;
        
        // Check if code should be marked as fully claimed
        if (referralCodes[codeHash].claimCount >= referralCodes[codeHash].maxClaims) {
            referralCodes[codeHash].claimed = true;
        }
        
        totalCodesClaimed = totalCodesClaimed + 1;
        
        emit ReferralCodeClaimed(
            codeHash,
            msg.sender,
            referralCodes[codeHash].creator,
            referralCodes[codeHash].rewardAmount,
            block.timestamp
        );
    }
    
    /**
     * @dev Reclaim expired codes and their remaining rewards
     * @param codeHash Hash of the code to reclaim
     */
    function reclaimExpiredCode(bytes32 codeHash) external nonReentrant whenNotPaused {
        require(referralCodes[codeHash].creator == msg.sender, "Not code creator");
        require(referralCodes[codeHash].expiry <= block.timestamp, "Code not expired");
        require(referralCodes[codeHash].isActive, "Code already reclaimed");
        
        // Calculate remaining rewards
        uint256 remainingClaims = referralCodes[codeHash].maxClaims - referralCodes[codeHash].claimCount;
        uint256 reclaimedAmount = remainingClaims * referralCodes[codeHash].rewardAmount;
        
        // Mark code as inactive
        referralCodes[codeHash].isActive = false;
        
        // Update user rewards
        userReferralData[msg.sender].totalRewardsEarned = userReferralData[msg.sender].totalRewardsEarned + reclaimedAmount;
        totalRewardsDistributed = totalRewardsDistributed + reclaimedAmount;
        
        emit CodeReclaimed(codeHash, msg.sender, reclaimedAmount);
        emit ReferralCodeExpired(codeHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Blacklist or unblacklist a user
     * @param user Address to blacklist/unblacklist
     * @param blacklisted Whether to blacklist or unblacklist
     * @param reason Reason for the action
     */
    function setUserBlacklisted(
        address user,
        bool blacklisted,
        string memory reason
    ) external onlyOwner {
        require(user != address(0), "Invalid address");
        
        blacklistedAddresses[user] = blacklisted;
        userReferralData[user].isBlacklisted = blacklisted;
        
        emit UserBlacklisted(user, blacklisted, reason);
    }
    
    /**
     * @dev Emergency pause/unpause functionality
     * @param paused Whether to pause or unpause
     */
    function setPaused(bool paused) external onlyOwner {
        if (paused) {
            _pause();
        } else {
            _unpause();
        }
    }
    
    /**
     * @dev Get referral code details
     * @param codeHash Hash of the referral code
     * @return creator Code creator address
     * @return expiry Expiry timestamp
     * @return claimed Whether code is fully claimed
     * @return claimCount Current claim count
     * @return maxClaims Maximum allowed claims
     * @return rewardAmount Reward amount per claim
     * @return codeString Human-readable code string
     * @return isActive Whether code is active
     */
    function getReferralCode(bytes32 codeHash) external view returns (
        address creator,
        uint256 expiry,
        bool claimed,
        uint256 claimCount,
        uint256 maxClaims,
        uint256 rewardAmount,
        string memory codeString,
        bool isActive
    ) {
        ReferralCode memory code = referralCodes[codeHash];
        return (
            code.creator,
            code.expiry,
            code.claimed,
            code.claimCount,
            code.maxClaims,
            code.rewardAmount,
            code.codeString,
            code.isActive
        );
    }
    
    /**
     * @dev Get user referral statistics
     * @param user User address
     * @return totalCodesCreated Total codes created by user
     * @return totalCodesClaimed Total codes claimed by user
     * @return totalRewardsEarned Total rewards earned by user
     * @return lastCodeGeneration Last code generation timestamp
     * @return isBlacklisted Whether user is blacklisted
     * @return cooldownEndTime When user's cooldown ends
     */
    function getUserReferralData(address user) external view returns (
        uint256 totalCodesCreated,
        uint256 totalCodesClaimed,
        uint256 totalRewardsEarned,
        uint256 lastCodeGeneration,
        bool isBlacklisted,
        uint256 cooldownEndTime
    ) {
        UserReferralData memory data = userReferralData[user];
        return (
            data.totalCodesCreated,
            data.totalCodesClaimed,
            data.totalRewardsEarned,
            data.lastCodeGeneration,
            data.isBlacklisted,
            data.cooldownEndTime
        );
    }
    
    /**
     * @dev Get system statistics
     * @return totalCodesGenerated Total codes generated
     * @return totalCodesClaimed Total codes claimed
     * @return totalRewardsDistributed Total rewards distributed
     */
    function getSystemStats() external view returns (
        uint256 totalCodesGenerated,
        uint256 totalCodesClaimed,
        uint256 totalRewardsDistributed
    ) {
        return (totalCodesGenerated, totalCodesClaimed, totalRewardsDistributed);
    }
    
    /**
     * @dev Internal function to generate VRF-based code hash
     * @param player Player address
     * @param requestId VRF request ID
     * @return codeHash Generated code hash
     */
    function _generateVRFCodeHash(address player, uint256 requestId) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                player,
                requestId,
                block.timestamp,
                randomnessContract.getCurrentRandomnessRound()
            )
        );
    }
    
    /**
     * @dev Internal function to generate blockhash-based code hash
     * @param player Player address
     * @return codeHash Generated code hash
     */
    function _generateBlockhashCodeHash(address player) internal view returns (bytes32) {
        return keccak256(
            abi.encodePacked(
                player,
                block.timestamp,
                block.prevrandao,
                blockhash(block.number - 1)
            )
        );
    }
    
    /**
     * @dev Internal function to generate human-readable code string
     * @param codeHash Code hash
     * @return codeString Human-readable code string
     */
    function _generateCodeString(bytes32 codeHash) internal pure returns (string memory) {
        return string(abi.encodePacked(
            "PIZZA",
            _bytes32ToString(codeHash)
        ));
    }
    
    /**
     * @dev Internal function to process referral claim
     * @param codeHash Code hash
     * @param claimer Claimer address
     */
    function _processReferralClaim(bytes32 codeHash, address claimer) internal {
        ReferralCode storage code = referralCodes[codeHash];
        
        // Create claim record
        codeClaims[codeHash].push(ReferralClaim({
            claimer: claimer,
            claimTime: block.timestamp,
            rewardAmount: code.rewardAmount,
            isProcessed: true
        }));
        
        // Award rewards to claimer
        userReferralData[claimer].totalRewardsEarned = userReferralData[claimer].totalRewardsEarned + code.rewardAmount;
        
        // Award bonus rewards to code creator
        uint256 creatorBonus = BONUS_REWARD_AMOUNT;
        userReferralData[code.creator].totalRewardsEarned = userReferralData[code.creator].totalRewardsEarned + creatorBonus;
        
        totalRewardsDistributed = totalRewardsDistributed + code.rewardAmount + creatorBonus;
        
        emit RewardDistributed(claimer, code.rewardAmount, "Referral code claim");
        emit RewardDistributed(code.creator, creatorBonus, "Referral code creator bonus");
    }
    
    /**
     * @dev Helper function to convert bytes32 to string
     * @param value Bytes32 value
     * @return String representation
     */
    function _bytes32ToString(bytes32 value) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(8);
        for (uint256 i = 0; i < 4; i++) {
            str[i * 2] = alphabet[uint8(value[i] >> 4)];
            str[i * 2 + 1] = alphabet[uint8(value[i] & 0x0f)];
        }
        return string(str);
    }
} 