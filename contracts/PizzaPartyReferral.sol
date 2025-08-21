// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PizzaPartyReferral
 * @dev Referral system for Pizza Party game
 * 
 * FEATURES:
 * - Create referral codes
 * - Process referrals
 * - Track referral rewards
 * - Referral analytics
 * - Anti-abuse measures
 */
contract PizzaPartyReferral is ReentrancyGuard, Ownable, Pausable {
    
    // VMF Token contract
    IERC20 public immutable vmfToken;
    
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
        uint256 rewardAmount,
        uint256 claimTime
    );
    
    event ReferralRewardDistributed(
        address indexed referrer,
        address indexed referee,
        uint256 rewardAmount
    );
    
    event UserBlacklisted(address indexed user, bool blacklisted);
    
    // Modifiers
    modifier notBlacklisted(address user) {
        require(!blacklistedAddresses[user], "User is blacklisted");
        require(!userReferralData[user].isBlacklisted, "User is blacklisted");
        _;
    }
    
    modifier validReferralCode(string memory code) {
        require(bytes(code).length >= MIN_CODE_LENGTH, "Code too short");
        require(bytes(code).length <= MAX_CODE_LENGTH, "Code too long");
        require(_isValidReferralCodeFormat(code), "Invalid code format");
        _;
    }
    
    modifier codeExists(string memory code) {
        bytes32 codeHash = keccak256(abi.encodePacked(code));
        require(referralCodes[codeHash].isActive, "Referral code does not exist");
        _;
    }
    
    modifier codeNotExpired(string memory code) {
        bytes32 codeHash = keccak256(abi.encodePacked(code));
        require(block.timestamp < referralCodes[codeHash].expiry, "Referral code expired");
        _;
    }
    
    modifier codeNotClaimed(string memory code, address user) {
        bytes32 codeHash = keccak256(abi.encodePacked(code));
        require(!referralCodes[codeHash].claimed, "Code already claimed");
        require(userClaimCount[user] < MAX_CLAIMS_PER_CODE, "Max claims reached");
        _;
    }
    
    constructor(address _vmfToken) Ownable(msg.sender) {
        require(_vmfToken != address(0), "Invalid VMF token address");
        vmfToken = IERC20(_vmfToken);
    }
    
    /**
     * @dev Create a new referral code
     */
    function createReferralCode() external nonReentrant whenNotPaused notBlacklisted(msg.sender) {
        UserReferralData storage userData = userReferralData[msg.sender];
        
        // Check cooldown
        require(block.timestamp >= userData.cooldownEndTime, "Cooldown period active");
        
        // Check code limit
        require(userData.totalCodesCreated < MAX_CODES_PER_USER, "Max codes reached");
        
        // Generate referral code
        string memory code = _generateReferralCode(msg.sender);
        bytes32 codeHash = keccak256(abi.encodePacked(code));
        
        // Check if code already exists
        require(!referralCodes[codeHash].isActive, "Code already exists");
        
        // Create referral code
        referralCodes[codeHash] = ReferralCode({
            codeHash: codeHash,
            creator: msg.sender,
            expiry: block.timestamp + CODE_EXPIRY_DURATION,
            claimed: false,
            claimCount: 0,
            maxClaims: MAX_CLAIMS_PER_CODE,
            rewardAmount: DEFAULT_REWARD_AMOUNT,
            codeString: code,
            isActive: true
        });
        
        // Update user data
        userData.totalCodesCreated++;
        userData.lastCodeGeneration = block.timestamp;
        userData.cooldownEndTime = block.timestamp + GENERATION_COOLDOWN;
        
        // Update global stats
        totalCodesGenerated++;
        
        emit ReferralCodeGenerated(
            codeHash,
            msg.sender,
            code,
            block.timestamp + CODE_EXPIRY_DURATION,
            MAX_CLAIMS_PER_CODE,
            DEFAULT_REWARD_AMOUNT
        );
    }
    
    /**
     * @dev Process a referral code
     */
    function processReferralCode(string memory code, address user) 
        external 
        nonReentrant 
        whenNotPaused 
        validReferralCode(code)
        codeExists(code)
        codeNotExpired(code)
        codeNotClaimed(code, user)
        notBlacklisted(user)
    {
        bytes32 codeHash = keccak256(abi.encodePacked(code));
        ReferralCode storage referralCode = referralCodes[codeHash];
        
        // Check if user has already claimed this code
        require(userClaimCount[user] < referralCode.maxClaims, "Max claims reached");
        
        // Process the referral
        _processReferralCode(code, user);
        
        // Update claim count
        userClaimCount[user]++;
        referralCode.claimCount++;
        
        // Check if code should be marked as claimed
        if (referralCode.claimCount >= referralCode.maxClaims) {
            referralCode.claimed = true;
        }
        
        // Update global stats
        totalCodesClaimed++;
        
        emit ReferralCodeClaimed(
            codeHash,
            user,
            referralCode.rewardAmount,
            block.timestamp
        );
    }
    
    /**
     * @dev Get referral code info
     */
    function getReferralCodeInfo(string memory code) 
        external 
        view 
        validReferralCode(code)
        returns (ReferralCode memory)
    {
        bytes32 codeHash = keccak256(abi.encodePacked(code));
        return referralCodes[codeHash];
    }
    
    /**
     * @dev Get user referral data
     */
    function getUserReferralData(address user) external view returns (UserReferralData memory) {
        return userReferralData[user];
    }
    
    /**
     * @dev Get referral claims for a code
     */
    function getReferralClaims(string memory code) 
        external 
        view 
        validReferralCode(code)
        returns (ReferralClaim[] memory)
    {
        bytes32 codeHash = keccak256(abi.encodePacked(code));
        return codeClaims[codeHash];
    }
    
    /**
     * @dev Blacklist/unblacklist user
     */
    function setUserBlacklist(address user, bool blacklisted) external onlyOwner {
        blacklistedAddresses[user] = blacklisted;
        userReferralData[user].isBlacklisted = blacklisted;
        emit UserBlacklisted(user, blacklisted);
    }
    
    /**
     * @dev Emergency pause/unpause
     */
    function emergencyPause(bool pause) external onlyOwner {
        if (pause) {
            _pause();
        } else {
            _unpause();
        }
    }
    
    /**
     * @dev Withdraw accumulated VMF (emergency only)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = vmfToken.balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        require(vmfToken.transfer(owner(), balance), "Withdrawal failed");
    }
    
    /**
     * @dev Internal function to process referral code
     */
    function _processReferralCode(string memory code, address user) internal {
        bytes32 codeHash = keccak256(abi.encodePacked(code));
        ReferralCode storage referralCode = referralCodes[codeHash];
        
        // Create claim record
        ReferralClaim memory claim = ReferralClaim({
            claimer: user,
            claimTime: block.timestamp,
            rewardAmount: referralCode.rewardAmount,
            isProcessed: false
        });
        
        codeClaims[codeHash].push(claim);
        
        // Update user data
        UserReferralData storage userData = userReferralData[user];
        userData.totalCodesClaimed++;
        userData.totalRewardsEarned += referralCode.rewardAmount;
        
        // Update referrer data
        UserReferralData storage referrerData = userReferralData[referralCode.creator];
        referrerData.totalRewardsEarned += BONUS_REWARD_AMOUNT;
        
        // Transfer rewards
        if (vmfToken.balanceOf(address(this)) >= referralCode.rewardAmount + BONUS_REWARD_AMOUNT) {
            require(vmfToken.transfer(user, referralCode.rewardAmount), "Reward transfer failed");
            require(vmfToken.transfer(referralCode.creator, BONUS_REWARD_AMOUNT), "Bonus transfer failed");
            
            totalRewardsDistributed += referralCode.rewardAmount + BONUS_REWARD_AMOUNT;
            
            emit ReferralRewardDistributed(
                referralCode.creator,
                user,
                referralCode.rewardAmount + BONUS_REWARD_AMOUNT
            );
        }
    }
    
    /**
     * @dev Internal function to generate referral code
     */
    function _generateReferralCode(address user) internal view returns (string memory) {
        bytes32 hash = keccak256(abi.encodePacked(
            user,
            block.timestamp,
            block.prevrandao
        ));
        
        // Convert to alphanumeric string
        string memory chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        bytes memory result = new bytes(MIN_CODE_LENGTH);
        
        for (uint256 i = 0; i < MIN_CODE_LENGTH; i++) {
            result[i] = bytes(chars)[uint8(hash[i]) % bytes(chars).length];
        }
        
        return string(result);
    }
    
    /**
     * @dev Internal function to validate referral code format
     */
    function _isValidReferralCodeFormat(string memory code) internal pure returns (bool) {
        bytes memory codeBytes = bytes(code);
        
        for (uint256 i = 0; i < codeBytes.length; i++) {
            bytes1 char = codeBytes[i];
            if (!((char >= 0x41 && char <= 0x5A) || // A-Z
                  (char >= 0x30 && char <= 0x39))) { // 0-9
                return false;
            }
        }
        
        return true;
    }
}
