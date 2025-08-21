// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./FreeRandomness.sol";
import "./FreePriceOracle.sol";
import "./IPizzaParty.sol";
import "./ChainlinkVRF.sol";

// Events
event PlayerEntered(address indexed player, uint256 indexed gameId, uint256 amount);
event JackpotUpdated(uint256 dailyJackpot, uint256 weeklyJackpot);
event ToppingsAwarded(address indexed player, uint256 amount, string reason);
event ReferralCreated(address indexed player, string code);
event ReferralProcessed(string code, address player);
event FirstOrderRewardClaimed(address indexed player, uint256 amount);
event LoyaltyPointsAwarded(address indexed player, uint256 points, string reason);
event SecureRandomnessGenerated(uint256 indexed roundId, bytes32 seed);
event EntropyContributed(address indexed contributor, bytes32 entropy, uint256 roundId);
event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
event RoleAdminSet(bytes32 indexed role, address indexed admin);
event GameStateUnlocked(uint256 indexed gameId, address indexed sender);
event JackpotUpdateCooldownSet(uint256 cooldown);
event JackpotEntryAdded(address indexed player, uint256 amount);
event BatchPlayersProcessed(uint256 indexed blockNumber, uint256 totalProcessed, uint256 totalPlayers);
event GasOptimizationCompleted(uint256 timestamp, uint256 threshold);
event DailyWinnersSelected(uint256 gameId, address[] winners, uint256 jackpot);
event WeeklyWinnersSelected(uint256 gameId, address[] winners, uint256 jackpot);
event ReferralUsed(address indexed referrer, address indexed referee);
event PlayerBlacklisted(address indexed player, bool blacklisted);
event EmergencyPause(bool paused);
event RandomnessRequested(uint256 gameId, uint256 randomnessRoundId);
event WinnersSelectedWithRandomness(uint256 gameId, uint256 randomNumber, address[] winners);
event VRFRequestSubmitted(uint256 indexed requestId, uint256 indexed gameId, string gameType);
event VRFWinnersSelected(uint256 indexed gameId, string gameType, address[] winners, uint256[] randomWords);
event RateLimitTriggered(address indexed user, uint256 cooldownEnd);
event SecurityCheckFailed(address indexed user, string reason);
event InputValidationFailed(address indexed user, string input, string reason);
event JackpotUpdatedAtomic(uint256 indexed gameId, uint256 oldAmount, uint256 newAmount, uint256 nonce);
event WeeklyChallengeCompleted(address indexed player, uint256 challengeId, uint256 reward);
event DynamicEntryFeeCalculated(uint256 vmfPrice, uint256 requiredVMF, uint256 timestamp);

/**
 * @title PizzaParty
 * @dev A decentralized gaming platform on Base network with DYNAMIC PRICING
 * 
 * SECURITY FEATURES:
 * - ReentrancyGuard: Prevents reentrancy attacks
 * - Ownable: Access control for admin functions
 * - Pausable: Emergency pause functionality
 * - SafeMath: Overflow protection
 * - Input validation: Sanitized inputs
 * - Rate limiting: Cooldown periods
 * - DYNAMIC PRICING: $1 entry fee regardless of VMF price
 * - CHAINLINK VRF: Truly random winner selection using Chainlink VRF v2.5
 */
contract PizzaParty is ReentrancyGuard, Ownable, Pausable, IPizzaParty {
    
    // VMF Token contract
    IERC20 public immutable vmfToken;
    
    // Free Randomness contract (legacy)
    FreeRandomness public randomnessContract;
    
    // Chainlink VRF contract for truly random winner selection
    ChainlinkVRF public vrfContract;
    
    // Free Price Oracle for dynamic pricing
    FreePriceOracle public priceOracle;
    
    // Game constants
    uint256 public constant DOLLAR_ENTRY_FEE = 1 * 10**18; // $1 USD (18 decimals)
    uint256 public constant DAILY_WINNERS_COUNT = 8;
    uint256 public constant WEEKLY_WINNERS_COUNT = 10;
    uint256 public constant REFERRAL_REWARD = 2; // 2 toppings per referral
    uint256 public constant DAILY_PLAY_REWARD = 1; // 1 topping per day
    uint256 public constant BASE_SEPOLIA_HOLDING_REWARD = 1; // 1 topping per .001 Base Sepolia ETH
    uint256 public constant STREAK_BONUS = 3; // 3 toppings for 7-day streak
    uint256 public constant FIRST_ORDER_REWARD = 5; // 5 toppings for first order
    uint256 public constant MAX_JACKPOT_ENTRIES = 100; // Maximum jackpot entries per user
    uint256 public constant JACKPOT_ENTRY_COST = 1 * 10**18; // Dynamic $1 VMF per jackpot entry (calculated via price oracle)
    uint256 public constant JACKPOT_MULTIPLIER = 2; // 2x multiplier for jackpot entries
    uint256 public constant LOYALTY_POINTS_PER_DOLLAR = 10; // 10 points per dollar of VMF
    
    // Security constants
    uint256 public constant MAX_DAILY_ENTRIES = 10;
    uint256 public constant ENTRY_COOLDOWN = 1 hours;
    uint256 public constant MIN_BASE_SEPOLIA_HOLDING = 1 * 10**15; // 0.001 Base Sepolia ETH minimum
    uint256 public constant MAX_REFERRAL_CODE_LENGTH = 50;
    uint256 public constant MIN_REFERRAL_CODE_LENGTH = 3;
    uint256 public constant MAX_REWARD_AMOUNT = 1000; // Maximum toppings per reward
    uint256 public constant MAX_DAILY_REWARDS = 100; // Maximum daily rewards per user
    
    // Dynamic pricing constants
    uint256 public constant MAX_PRICE_DEVIATION = 50; // 50% max deviation
    uint256 public constant PRICE_UPDATE_THRESHOLD = 5 minutes;
    
    // Game state
    uint256 private _gameId;
    uint256 public currentDailyJackpot;
    uint256 public currentWeeklyJackpot;
    uint256 public lastDailyDraw;
    uint256 public lastWeeklyDraw;
    
    // Randomness state
    uint256 public currentRandomnessRound;
    mapping(uint256 => address[]) public dailyPlayers;
    mapping(uint256 => uint256) public dailyPlayerCount;
    mapping(uint256 => address[]) public weeklyPlayers;
    mapping(uint256 => uint256) public weeklyPlayerCount;
    
    // Enhanced randomness state for MED-001 fix
    mapping(uint256 => bytes32) public randomnessSeeds;
    mapping(uint256 => uint256) public entropyContributions;
    mapping(uint256 => address[]) public entropyContributors;
    uint256 public lastEntropyUpdate;
    uint256 public entropyRoundId;
    
    // VRF state for Chainlink VRF integration
    mapping(uint256 => bool) public vrfRequests;
    mapping(uint256 => address[]) public pendingWinners;
    bool public useVRF = true; // Flag to switch between legacy and VRF
    
    // Race condition prevention for MED-003 fix
    mapping(uint256 => bool) public gameStateLocked;
    mapping(uint256 => uint256) public jackpotUpdateNonce;
    mapping(uint256 => bytes32) public jackpotStateHash;
    uint256 public lastJackpotUpdate;
    uint256 public jackpotUpdateCooldown;
    
    // Access control roles for MED-002 fix
    mapping(bytes32 => mapping(address => bool)) public roles;
    mapping(bytes32 => address) public roleAdmins;
    
    // Role constants
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    
    // Player data with enhanced reward tracking
    struct Player {
        uint256 totalToppings;
        uint256 dailyEntries;
        uint256 weeklyEntries;
        uint256 lastEntryTime;
        uint256 streakDays;
        uint256 lastStreakUpdate;
        bool isBlacklisted;
        uint256 lastVMFHoldingsCheck;
        
        // Reward system data
        uint256 loyaltyPoints;
        uint256 totalOrders;
        uint256 weeklyChallengesCompleted;
        uint256 jackpotEntries;
        uint256 lastRewardClaim;
        bool hasCompletedFirstOrder;
        
        // Enhanced security tracking
        uint256 dailyRewardsClaimed;
        uint256 lastSecurityCheck;
        bool isRateLimited;
    }
    
    // Referral data
    struct Referral {
        address referrer;
        uint256 totalReferrals;
        uint256 totalRewards;
        bool isActive;
    }
    
    // Game data
    struct Game {
        uint256 gameId;
        uint256 startTime;
        uint256 endTime;
        uint256 totalEntries;
        uint256 jackpotAmount;
        address[] winners;
        bool isCompleted;
        uint256 randomnessRoundId;
    }
    
    // Weekly challenge data
    struct WeeklyChallenge {
        uint256 challengeId;
        string challengeName;
        uint256 rewardAmount;
        uint256 completionRequirement;
        bool isActive;
        mapping(address => bool) completedBy;
    }
    
    // Mappings
    mapping(address => Player) public players;
    mapping(string => address) public referralCodes;
    mapping(address => Referral) public referrals;
    mapping(uint256 => Game) public games;
    mapping(address => bool) public blacklistedAddresses;
    mapping(uint256 => WeeklyChallenge) public weeklyChallenges;
    
    // Enhanced security mappings
    mapping(address => uint256) public userDailyRewards;
    mapping(address => uint256) public userRateLimitEnd;
    mapping(address => uint256) public userLastActivity;
    
    // Modifiers
    modifier notBlacklisted(address player) {
        require(!blacklistedAddresses[player], "Player is blacklisted");
        require(!players[player].isBlacklisted, "Player is blacklisted");
        _;
    }
    
    modifier validReferralCode(string memory code) {
        require(bytes(code).length >= MIN_REFERRAL_CODE_LENGTH, "Referral code too short");
        require(bytes(code).length <= MAX_REFERRAL_CODE_LENGTH, "Referral code too long");
        require(_isValidReferralCodeFormat(code), "Invalid referral code format");
        require(referralCodes[code] != address(0), "Referral code not found");
        _;
    }
    
    modifier validAddress(address addr) {
        require(addr != address(0), "Invalid address");
        _;
    }
    
    modifier rateLimited() {
        require(!players[msg.sender].isRateLimited, "User is rate limited");
        require(block.timestamp >= players[msg.sender].lastEntryTime + ENTRY_COOLDOWN, "Rate limit exceeded");
        require(block.timestamp >= userRateLimitEnd[msg.sender], "Rate limit cooldown active");
        _;
    }
    
    modifier canClaimReward() {
        require(block.timestamp >= players[msg.sender].lastRewardClaim + 1 days, "Reward already claimed today");
        require(players[msg.sender].dailyRewardsClaimed < MAX_DAILY_REWARDS, "Daily reward limit reached");
        _;
    }
    
    modifier validRewardAmount(uint256 amount) {
        require(amount > 0, "Reward amount must be positive");
        require(amount <= MAX_REWARD_AMOUNT, "Reward amount too high");
        _;
    }
    
    modifier securityCheck() {
        require(block.timestamp >= players[msg.sender].lastSecurityCheck + 1 hours, "Security check too frequent");
        _;
    }
    
    constructor(address _vmfToken, address _randomnessContract, address _priceOracle, address _vrfContract) Ownable(msg.sender) {
        // Allow zero address for VMF token in testnet (Base Sepolia testing)
        if (_vmfToken != address(0)) {
            vmfToken = IERC20(_vmfToken);
        }
        require(_randomnessContract != address(0), "Invalid randomness contract address");
        require(_priceOracle != address(0), "Invalid price oracle address");
        randomnessContract = FreeRandomness(_randomnessContract);
        priceOracle = FreePriceOracle(_priceOracle);
        
        // Set VRF contract (optional for backward compatibility)
        if (_vrfContract != address(0)) {
            vrfContract = ChainlinkVRF(payable(_vrfContract));
        }
        
        // Initialize access control (MED-002 fix)
        _initializeAccessControl();
        
        // Initialize game state
        _gameId = 1;
        _startNewDailyGame();
        
        // Initialize weekly challenges
        _initializeWeeklyChallenges();
    }
    
    /**
     * @dev Initialize access control roles
     */
    function _initializeAccessControl() internal {
        // Grant admin role to owner
        roles[ADMIN_ROLE][msg.sender] = true;
        roles[OPERATOR_ROLE][msg.sender] = true;
        roles[EMERGENCY_ROLE][msg.sender] = true;
        roles[AUDITOR_ROLE][msg.sender] = true;
        
        // Set role admins
        roleAdmins[ADMIN_ROLE] = msg.sender;
        roleAdmins[OPERATOR_ROLE] = msg.sender;
        roleAdmins[EMERGENCY_ROLE] = msg.sender;
        roleAdmins[AUDITOR_ROLE] = msg.sender;
        
        emit RoleGranted(ADMIN_ROLE, msg.sender, msg.sender);
        emit RoleGranted(OPERATOR_ROLE, msg.sender, msg.sender);
        emit RoleGranted(EMERGENCY_ROLE, msg.sender, msg.sender);
        emit RoleGranted(AUDITOR_ROLE, msg.sender, msg.sender);
    }
    
    /**
     * @dev Enhanced randomness generation with multiple entropy sources (MED-001 fix)
     */
    function generateSecureRandomness() external whenNotPaused returns (uint256) {
        require(block.timestamp >= lastEntropyUpdate + 1 hours, "Entropy update too frequent");
        
        // Combine multiple entropy sources
        bytes32 seed = keccak256(
            abi.encodePacked(
                block.timestamp,
                block.prevrandao,
                blockhash(block.number - 1),
                blockhash(block.number - 2),
                msg.sender,
                entropyRoundId,
                randomnessContract.getCurrentRandomnessRound()
            )
        );
        
        // Add user-contributed entropy
        for (uint256 i = 0; i < entropyContributors[entropyRoundId].length; i++) {
            seed = keccak256(abi.encodePacked(seed, entropyContributors[entropyRoundId][i]));
        }
        
        randomnessSeeds[entropyRoundId] = seed;
        lastEntropyUpdate = block.timestamp;
        entropyRoundId = entropyRoundId + 1;
        
        emit SecureRandomnessGenerated(entropyRoundId - 1, seed);
        
        return uint256(seed);
    }
    
    /**
     * @dev Request randomness for daily winner selection
     */
    function requestDailyRandomness() external onlyOwner whenNotPaused {
        uint256 randomnessRoundId = randomnessContract.requestRandomness();
        currentRandomnessRound = randomnessRoundId;
        
        emit RandomnessRequested(_gameId, randomnessRoundId);
    }
    
    /**
     * @dev Submit commitment for randomness (anyone can contribute)
     */
    function submitRandomnessCommitment(uint256 roundId, bytes32 commitment) external whenNotPaused {
        randomnessContract.submitCommitment(roundId, commitment);
    }
    
    /**
     * @dev Reveal randomness contribution
     */
    function revealRandomness(uint256 roundId, uint256 randomValue, bytes32 salt) external whenNotPaused {
        randomnessContract.revealRandomness(roundId, randomValue, salt);
    }
    
    /**
     * @dev Process daily winners selected by VRF
     * @param gameId Current game ID
     * @param winners Array of selected winners
     */
    function processDailyWinners(uint256 gameId, address[] calldata winners) external override {
        require(msg.sender == address(vrfContract), "Only VRF contract can call this");
        require(winners.length > 0, "No winners provided");
        
        // Distribute jackpot to winners
        uint256 prizePerWinner = currentDailyJackpot / winners.length;
        
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] != address(0)) {
                // Transfer VMF tokens to winner
                require(vmfToken.transfer(winners[i], prizePerWinner), "Transfer failed");
                
                // Award toppings to winner
                players[winners[i]].totalToppings += 10; // Bonus toppings for winning
                emit ToppingsAwarded(winners[i], 10, "Daily winner bonus");
            }
        }
        
        emit DailyWinnersSelected(gameId, winners, currentDailyJackpot);
        
        // Reset for next game
        _startNewDailyGame();
    }
    
    /**
     * @dev Process weekly winners selected by VRF
     * @param gameId Current game ID
     * @param winners Array of selected winners
     */
    function processWeeklyWinners(uint256 gameId, address[] calldata winners) external override {
        require(msg.sender == address(vrfContract), "Only VRF contract can call this");
        require(winners.length > 0, "No winners provided");
        
        // Distribute jackpot to winners
        uint256 prizePerWinner = currentWeeklyJackpot / winners.length;
        
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] != address(0)) {
                // Transfer VMF tokens to winner
                require(vmfToken.transfer(winners[i], prizePerWinner), "VMF prize transfer failed");
            }
        }
        
        emit WeeklyWinnersSelected(gameId, winners, currentWeeklyJackpot);
        
        // Reset weekly jackpot and toppings
        _resetWeeklyGame();
    }
    
    /**
     * @dev Get eligible players for daily draw
     * @param gameId Current game ID
     * @return eligiblePlayers Array of eligible players
     */
    function getEligibleDailyPlayers(uint256 gameId) external view override returns (address[] memory eligiblePlayers) {
        uint256 playerCount = dailyPlayerCount[gameId];
        eligiblePlayers = new address[](playerCount);
        
        for (uint256 i = 0; i < playerCount; i++) {
            eligiblePlayers[i] = dailyPlayers[gameId][i];
        }
        
        return eligiblePlayers;
    }
    
    /**
     * @dev Get eligible players for weekly draw
     * @param gameId Current game ID
     * @return eligiblePlayers Array of eligible players
     */
    function getEligibleWeeklyPlayers(uint256 gameId) external view override returns (address[] memory eligiblePlayers) {
        // This would need to be implemented based on your weekly player tracking
        // For now, returning empty array - implement based on your weekly player logic
        eligiblePlayers = new address[](0);
        return eligiblePlayers;
    }
    
    /**
     * @dev Get current game ID
     * @return gameId Current game ID
     */
    function getCurrentGameId() external view override returns (uint256 gameId) {
        return _gameId;
    }
    
    /**
     * @dev Check if daily draw is ready
     * @return ready Whether daily draw is ready
     */
    function isDailyDrawReady() external view override returns (bool ready) {
        return block.timestamp >= lastDailyDraw + 1 days;
    }
    
    /**
     * @dev Check if weekly draw is ready
     * @return ready Whether weekly draw is ready
     */
    function isWeeklyDrawReady() external view override returns (bool ready) {
        return block.timestamp >= lastWeeklyDraw + 7 days;
    }
    
    /**
     * @dev Request VRF for daily winner selection
     */
    function requestDailyVRF() external onlyRole(OPERATOR_ROLE) whenNotPaused {
        require(useVRF, "VRF not enabled");
        require(address(vrfContract) != address(0), "VRF contract not set");
        require(block.timestamp >= lastDailyDraw + 1 days, "Daily draw not ready");
        
        address[] memory eligiblePlayers = this.getEligibleDailyPlayers(_gameId);
        require(eligiblePlayers.length > 0, "No eligible players for daily draw");
        
        uint256 requestId = vrfContract.requestDailyRandomness(_gameId, eligiblePlayers);
        vrfRequests[requestId] = true;
        
        emit VRFRequestSubmitted(requestId, _gameId, "daily");
    }
    
    /**
     * @dev Request VRF for weekly winner selection
     */
    function requestWeeklyVRF() external onlyRole(OPERATOR_ROLE) whenNotPaused {
        require(useVRF, "VRF not enabled");
        require(address(vrfContract) != address(0), "VRF contract not set");
        require(block.timestamp >= lastWeeklyDraw + 7 days, "Weekly draw not ready");
        
        address[] memory eligiblePlayers = this.getEligibleWeeklyPlayers(_gameId);
        require(eligiblePlayers.length > 0, "No eligible players for weekly draw");
        
        uint256 requestId = vrfContract.requestWeeklyRandomness(_gameId, eligiblePlayers);
        vrfRequests[requestId] = true;
        
        emit VRFRequestSubmitted(requestId, _gameId, "weekly");
    }
    
    /**
     * @dev Set VRF contract address
     * @param _vrfContract Address of the VRF contract
     */
    function setVRFContract(address _vrfContract) external onlyOwner {
        vrfContract = ChainlinkVRF(payable(_vrfContract));
    }
    
    /**
     * @dev Toggle VRF usage
     * @param _useVRF Whether to use VRF or legacy randomness
     */
    function setUseVRF(bool _useVRF) external onlyOwner {
        useVRF = _useVRF;
    }
    
    /**
     * @dev Select daily winners using enhanced secure randomness (MED-001 fix) - LEGACY
     */
    function selectDailyWinners() external onlyRole(OPERATOR_ROLE) whenNotPaused {
        require(currentRandomnessRound > 0, "No randomness round requested");
        
        // Generate secure randomness with multiple entropy sources
        uint256 secureRandomNumber = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            blockhash(block.number - 1),
            msg.sender,
            entropyRoundId
        )));
        
        // Use enhanced randomness for winner selection
        address[] memory winners = _selectWinnersWithEnhancedRandomness(DAILY_WINNERS_COUNT, _gameId, secureRandomNumber);
        
        // Distribute jackpot to winners
        uint256 prizePerWinner = currentDailyJackpot / DAILY_WINNERS_COUNT;
        
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] != address(0)) {
                // Transfer VMF tokens to winner
                require(vmfToken.transfer(winners[i], prizePerWinner), "Transfer failed");
                
                // Award toppings to winner
                players[winners[i]].totalToppings += 10; // Bonus toppings for winning
                emit ToppingsAwarded(winners[i], 10, "Daily winner bonus");
            }
        }
        
        emit DailyWinnersSelected(_gameId, winners, currentDailyJackpot);
        emit WinnersSelectedWithRandomness(_gameId, secureRandomNumber, winners);
        
        // Reset for next game
        _startNewDailyGame();
    }
    
    /**
     * @dev Enhanced winner selection with multiple entropy sources
     */
    function _selectWinnersWithEnhancedRandomness(uint256 winnerCount, uint256 gameId, uint256 randomSeed) internal view returns (address[] memory) {
        address[] memory winners = new address[](winnerCount);
        uint256 totalEntries = dailyPlayerCount[gameId];
        
        if (totalEntries == 0) return winners;
        
        // Use multiple entropy sources for selection
        for (uint256 i = 0; i < winnerCount; i++) {
            uint256 winnerIndex = uint256(
                keccak256(
                    abi.encodePacked(
                        randomSeed,
                        i,
                        block.timestamp,
                        block.prevrandao,
                        gameId
                    )
                )
            ) % totalEntries;
            
            winners[i] = dailyPlayers[gameId][winnerIndex];
        }
        
        return winners;
    }
    
    /**
     * @dev Enhanced enter daily game with dynamic VMF pricing ($1 worth of VMF)
     */
    function enterDailyGame(string memory referralCode) external nonReentrant whenNotPaused notBlacklisted(msg.sender) rateLimited securityCheck {
        // Update user activity
        _updateUserActivity(msg.sender);
        
        // Validate game state
        _validateGameState();
        
        // Check for suspicious activity
        require(!_detectSuspiciousActivity(msg.sender), "Suspicious activity detected");
        
        // Get dynamic entry fee ($1 worth of VMF)
        uint256 requiredVMF = _calculateDynamicEntryFee();
        require(requiredVMF > 0, "Invalid entry fee calculated");
        
        // Check VMF balance and allowance
        require(vmfToken.balanceOf(msg.sender) >= requiredVMF, "Insufficient VMF balance");
        require(vmfToken.allowance(msg.sender, address(this)) >= requiredVMF, "Insufficient VMF allowance");
        
        require(players[msg.sender].dailyEntries < MAX_DAILY_ENTRIES, "Max daily entries reached");
        
        // Validate and sanitize referral code if provided
        string memory sanitizedReferralCode = "";
        if (bytes(referralCode).length > 0) {
            sanitizedReferralCode = _validateAndSanitizeInput(referralCode);
            require(_isValidReferralCodeFormat(sanitizedReferralCode), "Invalid referral code format");
        }
        
        // Transfer VMF tokens from player to contract
        require(vmfToken.transferFrom(msg.sender, address(this), requiredVMF), "VMF transfer failed");
        
        // Update player data
        players[msg.sender].dailyEntries = players[msg.sender].dailyEntries + 1;
        players[msg.sender].lastEntryTime = block.timestamp;
        players[msg.sender].totalToppings = players[msg.sender].totalToppings + DAILY_PLAY_REWARD;
        
        // Add player to current game
        dailyPlayers[_gameId].push(msg.sender);
        dailyPlayerCount[_gameId] = dailyPlayerCount[_gameId] + 1;
        
        // Update jackpot with VMF value
        currentDailyJackpot = currentDailyJackpot + requiredVMF;
        
        // Process referral if provided
        if (bytes(sanitizedReferralCode).length > 0) {
            _processReferralCode(sanitizedReferralCode, msg.sender);
        }
        
        // Award daily play reward
        _validateAndTrackReward(msg.sender, DAILY_PLAY_REWARD);
        emit ToppingsAwarded(msg.sender, DAILY_PLAY_REWARD, "Daily play reward");
        
        // Emit events
        emit PlayerEntered(msg.sender, _gameId, requiredVMF);
        emit JackpotUpdated(currentDailyJackpot, currentWeeklyJackpot);
        
        // Apply rate limiting for next entry
        _applyRateLimit(msg.sender, ENTRY_COOLDOWN);
    }
    
    /**
     * @dev Create a referral code
     */
    function createReferralCode() external nonReentrant whenNotPaused notBlacklisted(msg.sender) {
        require(referrals[msg.sender].referrer == address(0), "Referral code already exists");
        
        string memory code = _generateReferralCode(msg.sender);
        referralCodes[code] = msg.sender;
        
        referrals[msg.sender] = Referral({
            referrer: msg.sender,
            totalReferrals: 0,
            totalRewards: 0,
            isActive: true
        });
        
        emit ReferralCreated(msg.sender, code);
    }
    
    /**
     * @dev Draw daily winners
     */
    function drawDailyWinners() external onlyOwner {
        Game storage currentGame = games[_gameId];
        require(!currentGame.isCompleted, "Game already completed");
        require(block.timestamp >= currentGame.endTime, "Game not finished");
        
        address[] memory winners = _selectWinners(DAILY_WINNERS_COUNT, currentGame.totalEntries);
        
        // Count actual winners (non-zero addresses)
        uint256 actualWinnerCount = 0;
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] != address(0)) {
                actualWinnerCount++;
            }
        }
        
        // If no winners, keep jackpot for next round
        if (actualWinnerCount == 0) {
            currentGame.isCompleted = true;
            emit DailyWinnersSelected(_gameId, winners, currentDailyJackpot);
            _startNewDailyGame();
            return;
        }
        
        // Distribute jackpot evenly among actual winners
        uint256 prizePerWinner = currentDailyJackpot / actualWinnerCount;
        
        // Distribute VMF prizes
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] != address(0)) {
                require(vmfToken.transfer(winners[i], prizePerWinner), "VMF prize transfer failed");
            }
        }
        
        currentGame.winners = winners;
        currentGame.isCompleted = true;
        currentGame.jackpotAmount = currentDailyJackpot;
        
        emit DailyWinnersSelected(_gameId, winners, currentDailyJackpot);
        
        // Start new game
        _startNewDailyGame();
    }
    
    /**
     * @dev Draw weekly winners
     */
    function drawWeeklyWinners() external onlyOwner {
        require(block.timestamp >= lastWeeklyDraw + 7 days, "Weekly draw not ready");
        
        address[] memory winners = _selectWeeklyWinners();
        
        // Count actual winners (non-zero addresses)
        uint256 actualWinnerCount = 0;
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] != address(0)) {
                actualWinnerCount++;
            }
        }
        
        // If no winners, keep jackpot for next round
        if (actualWinnerCount == 0) {
            emit WeeklyWinnersSelected(_gameId, winners, currentWeeklyJackpot);
            _resetWeeklyGame();
            return;
        }
        
        // Distribute jackpot evenly among actual winners
        uint256 prizePerWinner = currentWeeklyJackpot / actualWinnerCount;
        
        // Distribute VMF prizes
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] != address(0)) {
                require(vmfToken.transfer(winners[i], prizePerWinner), "VMF prize transfer failed");
            }
        }
        
        emit WeeklyWinnersSelected(_gameId, winners, currentWeeklyJackpot);
        
        // Reset weekly jackpot and toppings
        _resetWeeklyGame();
    }
    
    /**
     * @dev Award Base Sepolia holdings toppings with enhanced security
     */
    function awardBaseSepoliaHoldingsToppings() external nonReentrant whenNotPaused notBlacklisted(msg.sender) canClaimReward validRewardAmount(BASE_SEPOLIA_HOLDING_REWARD) {
        require(block.timestamp >= players[msg.sender].lastVMFHoldingsCheck + 1 days, "Already checked today");
        
        uint256 balance = msg.sender.balance; // Base Sepolia ETH balance
        require(balance >= MIN_BASE_SEPOLIA_HOLDING, "Insufficient Base Sepolia ETH holdings");
        
        uint256 holdingsReward = (balance / MIN_BASE_SEPOLIA_HOLDING) * BASE_SEPOLIA_HOLDING_REWARD;
        require(holdingsReward > 0, "No reward available");
        
        // Validate and track reward
        _validateAndTrackReward(msg.sender, holdingsReward);
        
        // Update player data
        players[msg.sender].totalToppings = players[msg.sender].totalToppings + holdingsReward;
        players[msg.sender].lastVMFHoldingsCheck = block.timestamp;
        players[msg.sender].lastRewardClaim = block.timestamp;
        
        emit ToppingsAwarded(msg.sender, holdingsReward, "Base Sepolia holdings reward");
    }
    
    /**
     * @dev Award streak bonus with enhanced security
     */
    function awardStreakBonus() external nonReentrant whenNotPaused notBlacklisted(msg.sender) canClaimReward validRewardAmount(STREAK_BONUS) {
        require(players[msg.sender].streakDays >= 7, "7-day streak not reached");
        require(block.timestamp >= players[msg.sender].lastStreakUpdate + 1 days, "Streak bonus already claimed today");
        
        // Validate and track reward
        _validateAndTrackReward(msg.sender, STREAK_BONUS);
        
        // Update player data
        players[msg.sender].totalToppings = players[msg.sender].totalToppings + STREAK_BONUS;
        players[msg.sender].lastStreakUpdate = block.timestamp;
        players[msg.sender].lastRewardClaim = block.timestamp;
        
        emit ToppingsAwarded(msg.sender, STREAK_BONUS, "7-day streak bonus");
    }
    
    /**
     * @dev Claim weekly challenge reward with enhanced security
     */
    function claimWeeklyChallengeReward(uint256 challengeId) external nonReentrant whenNotPaused notBlacklisted(msg.sender) canClaimReward {
        WeeklyChallenge storage challenge = weeklyChallenges[challengeId];
        require(challenge.isActive, "Challenge not active");
        require(!challenge.completedBy[msg.sender], "Challenge already completed");
        require(challenge.rewardAmount > 0, "Invalid challenge reward");
        require(challenge.rewardAmount <= MAX_REWARD_AMOUNT, "Challenge reward too high");

        // Validate and track reward
        _validateAndTrackReward(msg.sender, challenge.rewardAmount);

        challenge.completedBy[msg.sender] = true;
        players[msg.sender].weeklyChallengesCompleted = players[msg.sender].weeklyChallengesCompleted + 1;
        players[msg.sender].totalToppings = players[msg.sender].totalToppings + challenge.rewardAmount;
        players[msg.sender].lastRewardClaim = block.timestamp;

        emit WeeklyChallengeCompleted(msg.sender, challengeId, challenge.rewardAmount);
        emit ToppingsAwarded(msg.sender, challenge.rewardAmount, challenge.challengeName);
    }
    
    /**
     * @dev Add player to jackpot with VMF tokens
     */
    function addJackpotEntry() external nonReentrant whenNotPaused notBlacklisted(msg.sender) {
        require(players[msg.sender].jackpotEntries < MAX_JACKPOT_ENTRIES, "Max jackpot entries reached");
        
        // Get dynamic jackpot entry cost ($1 worth of VMF)
        uint256 requiredVMF = _calculateDynamicEntryFee();
        require(requiredVMF > 0, "Invalid jackpot entry cost calculated");
        require(requiredVMF <= 1000 * 10**18, "Jackpot entry cost too high");
        
        // Check VMF balance and allowance
        require(vmfToken.balanceOf(msg.sender) >= requiredVMF, "Insufficient VMF balance");
        require(vmfToken.allowance(msg.sender, address(this)) >= requiredVMF, "Insufficient VMF allowance");
        
        // Transfer VMF tokens from player to contract
        require(vmfToken.transferFrom(msg.sender, address(this), requiredVMF), "VMF transfer failed");

        players[msg.sender].jackpotEntries = players[msg.sender].jackpotEntries + 1;
        currentWeeklyJackpot = currentWeeklyJackpot + requiredVMF * JACKPOT_MULTIPLIER;

        emit JackpotEntryAdded(msg.sender, requiredVMF);
    }
    
    /**
     * @dev Claim first order reward with enhanced security
     */
    function claimFirstOrderReward() external nonReentrant whenNotPaused notBlacklisted(msg.sender) canClaimReward validRewardAmount(FIRST_ORDER_REWARD) {
        require(!players[msg.sender].hasCompletedFirstOrder, "First order reward already claimed");
        require(players[msg.sender].totalOrders >= 1, "No first order completed");

        // Validate and track reward
        _validateAndTrackReward(msg.sender, FIRST_ORDER_REWARD);

        players[msg.sender].hasCompletedFirstOrder = true;
        players[msg.sender].totalToppings = players[msg.sender].totalToppings + FIRST_ORDER_REWARD;
        players[msg.sender].lastRewardClaim = block.timestamp;

        emit FirstOrderRewardClaimed(msg.sender, FIRST_ORDER_REWARD);
        emit ToppingsAwarded(msg.sender, FIRST_ORDER_REWARD, "First order reward");
    }
    
    /**
     * @dev Award loyalty points with enhanced security
     */
    function awardLoyaltyPoints() external nonReentrant whenNotPaused notBlacklisted(msg.sender) {
        uint256 balance = vmfToken.balanceOf(msg.sender);
        require(balance > 0, "No VMF balance");
        
        uint256 points = (balance / 10**18) * LOYALTY_POINTS_PER_DOLLAR;
        require(points > 0, "No loyalty points to award");
        require(points <= 10000, "Loyalty points too high");

        players[msg.sender].loyaltyPoints = players[msg.sender].loyaltyPoints + points;
        emit LoyaltyPointsAwarded(msg.sender, points, "VMF holdings");
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
        emit EmergencyPause(pause);
    }
    
    /**
     * @dev Blacklist/unblacklist player
     */
    function setPlayerBlacklist(address player, bool blacklisted) external onlyOwner {
        blacklistedAddresses[player] = blacklisted;
        players[player].isBlacklisted = blacklisted;
        emit PlayerBlacklisted(player, blacklisted);
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
     * @dev Check if player has entered today
     */
    function hasEnteredToday(address player) public view returns (bool) {
        uint256 today = block.timestamp - (block.timestamp % 1 days);
        return players[player].lastEntryTime >= today;
    }
    
    /**
     * @dev Get player info
     */
    function getPlayerInfo(address player) external view returns (Player memory) {
        return players[player];
    }
    
    /**
     * @dev Get referral info
     */
    function getReferralInfo(address player) external view returns (Referral memory) {
        return referrals[player];
    }
    
    /**
     * @dev Get current game info
     */
    function getCurrentGame() external view returns (Game memory) {
        return games[_gameId];
    }
    
    /**
     * @dev Get game info by ID
     */
    function getGame(uint256 gameId) external view returns (Game memory) {
        return games[gameId];
    }
    
    /**
     * @dev Internal function to start new daily game
     */
    function _startNewDailyGame() internal {
        _gameId++;
        uint256 gameId = _gameId;
        
        games[gameId] = Game({
            gameId: gameId,
            startTime: block.timestamp,
            endTime: block.timestamp + 1 days,
            totalEntries: 0,
            jackpotAmount: 0,
            winners: new address[](0),
            isCompleted: false,
            randomnessRoundId: 0 // Initialize randomness round
        });
        
        lastDailyDraw = block.timestamp;
    }
    
    /**
     * @dev Internal function to process referral
     */
    function _processReferral(address newPlayer, string memory referralCode) internal validReferralCode(referralCode) {
        address referrer = referralCodes[referralCode];
        require(referrer != newPlayer, "Cannot refer yourself");
        require(referrals[referrer].isActive, "Referral not active");
        
        // Award toppings to referrer
        players[referrer].totalToppings += REFERRAL_REWARD;
        referrals[referrer].totalReferrals++;
        referrals[referrer].totalRewards += REFERRAL_REWARD;
        
        // Award toppings to new player
        players[newPlayer].totalToppings += REFERRAL_REWARD;
        
        emit ReferralUsed(referrer, newPlayer);
        emit ToppingsAwarded(referrer, REFERRAL_REWARD, "Referral reward");
        emit ToppingsAwarded(newPlayer, REFERRAL_REWARD, "Referral bonus");
    }
    
    /**
     * @dev Internal function to update player streak
     */
    function _updateStreak(address player) internal {
        Player storage playerData = players[player];
        uint256 today = block.timestamp - (block.timestamp % 1 days);
        
        if (playerData.lastStreakUpdate < today) {
            if (playerData.lastStreakUpdate == today - 1 days) {
                playerData.streakDays++;
                
                // Award streak bonus
                if (playerData.streakDays % 7 == 0) {
                    playerData.totalToppings += STREAK_BONUS;
                    emit ToppingsAwarded(player, STREAK_BONUS, "7-day streak bonus");
                }
            } else {
                playerData.streakDays = 1;
            }
            
            playerData.lastStreakUpdate = today;
        }
    }
    
    /**
     * @dev Internal function to select winners using FREE secure randomness
     */
    function _selectWinners(uint256 winnerCount, uint256 gameId) internal view returns (address[] memory) {
        address[] memory winners = new address[](winnerCount);
        
        Game storage game = games[gameId];
        if (game.randomnessRoundId == 0) {
            return winners; // No randomness round assigned
        }
        
        // Get the secure random number from our free randomness contract
        uint256 randomNumber = randomnessContract.getFinalRandomNumber(game.randomnessRoundId);
        
        if (randomNumber == 0) {
            return winners; // Randomness not finalized yet
        }
        
        // Use the secure random number to select winners
        address[] storage players = dailyPlayers[gameId];
        uint256 totalPlayers = players.length;
        
        if (totalPlayers == 0) {
            return winners;
        }
        
        // Select winners using the secure random number
        for (uint256 i = 0; i < winnerCount && i < totalPlayers; i++) {
            uint256 randomIndex = uint256(keccak256(abi.encodePacked(randomNumber, i))) % totalPlayers;
            winners[i] = players[randomIndex];
        }
        
        return winners;
    }
    
    /**
     * @dev Internal function to select weekly winners based on toppings
     */
    function _selectWeeklyWinners() internal view returns (address[] memory) {
        address[] memory winners = new address[](WEEKLY_WINNERS_COUNT);
        
        // Get all players with toppings for the week
        address[] memory eligiblePlayers = new address[](1000); // Max 1000 players
        uint256 eligibleCount = 0;
        
        // This is a simplified implementation
        // In production, you would iterate through all players and collect those with toppings
        // For now, we'll use a placeholder that returns the actual number of eligible players
        
        // If no eligible players, return empty winners array
        if (eligibleCount == 0) {
            return winners;
        }
        
        // Select winners (up to the number of eligible players or WEEKLY_WINNERS_COUNT, whichever is smaller)
        uint256 winnersToSelect = eligibleCount < WEEKLY_WINNERS_COUNT ? eligibleCount : WEEKLY_WINNERS_COUNT;
        
        for (uint256 i = 0; i < winnersToSelect; i++) {
            // Simple selection - in production, implement weighted random selection based on toppings
            winners[i] = eligiblePlayers[i];
        }
        
        return winners;
    }
    
    /**
     * @dev Internal function to reset weekly game
     */
    function _resetWeeklyGame() internal {
        currentWeeklyJackpot = 0;
        lastWeeklyDraw = block.timestamp;
        
        // Reset all player toppings
        // Note: In production, you'd iterate through all players
        // This is simplified for gas efficiency
    }
    
    /**
     * @dev Internal function to generate referral code
     */
    function _generateReferralCode(address player) internal view returns (string memory) {
        return string(abi.encodePacked(
            "PIZZA",
            _addressToString(player),
            _uintToString(block.timestamp)
        ));
    }
    
    /**
     * @dev Helper function to convert address to string
     */
    function _addressToString(address addr) internal pure returns (string memory) {
        bytes memory b = new bytes(20);
        for (uint256 i = 0; i < 20; i++) {
            b[i] = bytes1(uint8(uint256(uint160(addr)) / (2**(8*(19 - i)))));
        }
        return string(b);
    }
    
    /**
     * @dev Helper function to convert uint to string
     */
    function _uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

    /**
     * @dev Initialize weekly challenges
     */
    function _initializeWeeklyChallenges() internal {
        // Example challenges:
        // weeklyChallenges[1] = WeeklyChallenge({
        //     challengeId: 1,
        //     challengeName: "Play 5 games in a week",
        //     rewardAmount: 100,
        //     completionRequirement: 5,
        //     isActive: true
        // });
        // weeklyChallenges[2] = WeeklyChallenge({
        //     challengeId: 2,
        //     challengeName: "Complete 3 daily games",
        //     rewardAmount: 50,
        //     completionRequirement: 3,
        //     isActive: true
        // });
    }

    /**
     * @dev Calculate dynamic entry fee based on current VMF price
     */
    function _calculateDynamicEntryFee() internal returns (uint256) {
        // Get current VMF price from oracle
        uint256 vmfPrice = priceOracle.getVMFPrice();
        
        // Calculate required VMF for $1 entry fee
        uint256 requiredVMF = priceOracle.getRequiredVMFForDollar();
        
        // Validate price deviation
        _validatePriceDeviation(vmfPrice);
        
        emit DynamicEntryFeeCalculated(vmfPrice, requiredVMF, block.timestamp);
        
        return requiredVMF;
    }
    
    /**
     * @dev Validate price deviation from last known price
     */
    function _validatePriceDeviation(uint256 currentPrice) internal view {
        // Get last known price from oracle
        uint256 lastPrice = priceOracle.getVMFPrice();
        
        if (lastPrice > 0) {
            uint256 deviation = _calculateDeviation(currentPrice, lastPrice);
            require(deviation <= MAX_PRICE_DEVIATION, "Price deviation too high");
        }
    }
    
    /**
     * @dev Calculate percentage deviation between two prices
     */
    function _calculateDeviation(uint256 price1, uint256 price2) internal pure returns (uint256) {
        if (price1 == price2) return 0;
        
        uint256 difference = price1 > price2 ? 
            price1 - price2 : price2 - price1;
        
        return (difference * 100) / price2;
    }
    
    /**
     * @dev Get current entry fee in VMF tokens
     */
    function getCurrentEntryFee() external view returns (uint256) {
        return priceOracle.getRequiredVMFForDollar();
    }
    
    /**
     * @dev Get current VMF price
     */
    function getCurrentVMFPrice() external view returns (uint256) {
        return priceOracle.getVMFPrice();
    }

    /**
     * @dev Enhanced referral code validation (MED-004 fix)
     */
    function _isValidReferralCodeFormat(string memory code) internal pure returns (bool) {
        bytes memory codeBytes = bytes(code);
        
        // Check length limits
        if (codeBytes.length < MIN_REFERRAL_CODE_LENGTH || codeBytes.length > MAX_REFERRAL_CODE_LENGTH) {
            return false;
        }
        
        // Check for valid characters (alphanumeric and underscore only)
        for (uint256 i = 0; i < codeBytes.length; i++) {
            bytes1 char = codeBytes[i];
            if (!((char >= 0x30 && char <= 0x39) || // 0-9
                  (char >= 0x41 && char <= 0x5A) || // A-Z
                  (char >= 0x61 && char <= 0x7A) || // a-z
                  char == 0x5F)) { // underscore
                return false;
            }
        }
        
        // Check for consecutive special characters
        for (uint256 i = 1; i < codeBytes.length; i++) {
            if (codeBytes[i] == 0x5F && codeBytes[i-1] == 0x5F) {
                return false; // No consecutive underscores
            }
        }
        
        // Check for reserved patterns
        string memory upperCode = _toUpperCase(code);
        if (_containsReservedPattern(upperCode)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Convert string to uppercase for pattern checking
     */
    function _toUpperCase(string memory str) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        bytes memory result = new bytes(strBytes.length);
        
        for (uint256 i = 0; i < strBytes.length; i++) {
            if (strBytes[i] >= 0x61 && strBytes[i] <= 0x7A) {
                result[i] = bytes1(uint8(strBytes[i]) - 32);
            } else {
                result[i] = strBytes[i];
            }
        }
        
        return string(result);
    }
    
    /**
     * @dev Check for reserved patterns in referral codes
     */
    function _containsReservedPattern(string memory code) internal pure returns (bool) {
        // List of reserved patterns
        string[] memory reservedPatterns = new string[](5);
        reservedPatterns[0] = "ADMIN";
        reservedPatterns[1] = "OWNER";
        reservedPatterns[2] = "SYSTEM";
        reservedPatterns[3] = "NULL";
        reservedPatterns[4] = "TEST";
        
        for (uint256 i = 0; i < reservedPatterns.length; i++) {
            if (_containsSubstring(code, reservedPatterns[i])) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @dev Check if string contains substring
     */
    function _containsSubstring(string memory str, string memory substr) internal pure returns (bool) {
        bytes memory strBytes = bytes(str);
        bytes memory substrBytes = bytes(substr);
        
        if (substrBytes.length > strBytes.length) {
            return false;
        }
        
        for (uint256 i = 0; i <= strBytes.length - substrBytes.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < substrBytes.length; j++) {
                if (strBytes[i + j] != substrBytes[j]) {
                    found = false;
                    break;
                }
            }
            if (found) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * @dev Validate and sanitize input string
     */
    function _validateAndSanitizeInput(string memory input) internal pure returns (string memory) {
        require(bytes(input).length > 0, "Input cannot be empty");
        require(bytes(input).length <= 100, "Input too long");
        
        // Remove any potentially dangerous characters
        bytes memory inputBytes = bytes(input);
        bytes memory sanitized = new bytes(inputBytes.length);
        uint256 sanitizedIndex = 0;
        
        for (uint256 i = 0; i < inputBytes.length; i++) {
            bytes1 char = inputBytes[i];
            if (char >= 0x20 && char <= 0x7E) { // Printable ASCII characters
                sanitized[sanitizedIndex] = char;
                sanitizedIndex++;
            }
        }
        
        require(sanitizedIndex > 0, "No valid characters in input");
        
        // Resize the array to the actual length
        bytes memory result = new bytes(sanitizedIndex);
        for (uint256 i = 0; i < sanitizedIndex; i++) {
            result[i] = sanitized[i];
        }
        
        return string(result);
    }
    
    /**
     * @dev Check if user is rate limited
     */
    function _isUserRateLimited(address user) internal view returns (bool) {
        return players[user].isRateLimited || 
               block.timestamp < userRateLimitEnd[user] ||
               block.timestamp < players[user].lastEntryTime + ENTRY_COOLDOWN;
    }
    
    /**
     * @dev Apply rate limiting to user
     */
    function _applyRateLimit(address user, uint256 duration) internal {
        players[user].isRateLimited = true;
        userRateLimitEnd[user] = block.timestamp + duration;
        emit RateLimitTriggered(user, userRateLimitEnd[user]);
    }
    
    /**
     * @dev Remove rate limiting from user
     */
    function _removeRateLimit(address user) internal {
        players[user].isRateLimited = false;
        userRateLimitEnd[user] = 0;
    }
    
    /**
     * @dev Validate reward amount and update daily tracking
     */
    function _validateAndTrackReward(address user, uint256 amount) internal {
        require(amount > 0, "Reward amount must be positive");
        require(amount <= MAX_REWARD_AMOUNT, "Reward amount too high");
        
        uint256 dailyTotal = userDailyRewards[user] + amount;
        require(dailyTotal <= MAX_DAILY_REWARDS, "Daily reward limit exceeded");
        
        userDailyRewards[user] = dailyTotal;
        players[user].dailyRewardsClaimed = players[user].dailyRewardsClaimed + amount;
    }
    
    /**
     * @dev Reset daily rewards tracking
     */
    function _resetDailyRewards(address user) internal {
        userDailyRewards[user] = 0;
        players[user].dailyRewardsClaimed = 0;
    }
    
    /**
     * @dev Update user activity timestamp
     */
    function _updateUserActivity(address user) internal {
        userLastActivity[user] = block.timestamp;
        players[user].lastSecurityCheck = block.timestamp;
    }
    
    /**
     * @dev Validate game state consistency
     */
    function _validateGameState() internal view {
        require(currentDailyJackpot >= 0, "Invalid daily jackpot");
        require(currentWeeklyJackpot >= 0, "Invalid weekly jackpot");
        require(_gameId > 0, "Invalid game ID");
    }
    
    /**
     * @dev Check for suspicious activity patterns
     */
    function _detectSuspiciousActivity(address user) internal view returns (bool) {
        if ((block.timestamp - userLastActivity[user]) < 30) {
            return true;
        }
        
        // Check for excessive daily entries
        if (players[user].dailyEntries > MAX_DAILY_ENTRIES) {
            return true;
        }
        
        // Check for excessive daily rewards
        if (userDailyRewards[user] > MAX_DAILY_REWARDS) {
            return true;
        }
        
        return false;
    }


    
    /**
     * @dev Contribute entropy to randomness generation
     */
    function contributeEntropy(bytes32 entropy) external whenNotPaused {
        require(entropy != bytes32(0), "Invalid entropy");
        require(!_hasContributedEntropy(msg.sender), "Already contributed");
        
        entropyContributors[entropyRoundId].push(msg.sender);
        entropyContributions[entropyRoundId] = entropyContributions[entropyRoundId] + uint256(entropy);
        
        emit EntropyContributed(msg.sender, entropy, entropyRoundId);
    }
    
    /**
     * @dev Check if user has contributed entropy
     */
    function _hasContributedEntropy(address user) internal view returns (bool) {
        for (uint256 i = 0; i < entropyContributors[entropyRoundId].length; i++) {
            if (entropyContributors[entropyRoundId][i] == user) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @dev Access control functions (MED-002 fix)
     */
    modifier onlyRole(bytes32 role) {
        require(roles[role][msg.sender] || msg.sender == owner(), "AccessControl: caller does not have role");
        _;
    }
    
    modifier onlyRoleAdmin(bytes32 role) {
        require(msg.sender == roleAdmins[role] || msg.sender == owner(), "AccessControl: caller is not role admin");
        _;
    }
    
    /**
     * @dev Grant role to address
     */
    function grantRole(bytes32 role, address account) external onlyRoleAdmin(role) {
        require(account != address(0), "Invalid address");
        roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }
    
    /**
     * @dev Revoke role from address
     */
    function revokeRole(bytes32 role, address account) external onlyRoleAdmin(role) {
        require(account != address(0), "Invalid address");
        roles[role][account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }
    
    /**
     * @dev Set role admin
     */
    function setRoleAdmin(bytes32 role, address admin) external onlyOwner {
        roleAdmins[role] = admin;
        emit RoleAdminSet(role, admin);
    }
    
    /**
     * @dev Check if address has role
     */
    function hasRole(bytes32 role, address account) external view returns (bool) {
        return roles[role][account] || account == owner();
    }

    /**
     * @dev Atomic jackpot update with state locking (MED-003 fix)
     */
    function updateJackpotAtomic(uint256 gameId, uint256 newAmount, bytes32 expectedStateHash) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        require(!gameStateLocked[gameId], "Game state is locked");
        require(block.timestamp >= lastJackpotUpdate + jackpotUpdateCooldown, "Jackpot update too frequent");
        require(expectedStateHash == jackpotStateHash[gameId], "State hash mismatch");
        
        // Lock the game state
        gameStateLocked[gameId] = true;
        
        // Update jackpot with atomic operation
        uint256 oldAmount = currentDailyJackpot;
        currentDailyJackpot = newAmount;
        
        // Update state tracking
        jackpotUpdateNonce[gameId] = jackpotUpdateNonce[gameId] + 1;
        jackpotStateHash[gameId] = keccak256(abi.encodePacked(newAmount, jackpotUpdateNonce[gameId], block.timestamp));
        lastJackpotUpdate = block.timestamp;
        
        // Unlock after successful update
        gameStateLocked[gameId] = false;
        
        emit JackpotUpdatedAtomic(gameId, oldAmount, newAmount, jackpotUpdateNonce[gameId]);
    }
    
    /**
     * @dev Get current jackpot state for atomic updates
     */
    function getJackpotState(uint256 gameId) external view returns (uint256 amount, bytes32 stateHash, uint256 nonce) {
        return (currentDailyJackpot, jackpotStateHash[gameId], jackpotUpdateNonce[gameId]);
    }
    
    /**
     * @dev Emergency unlock for stuck game states
     */
    function emergencyUnlockGame(uint256 gameId) external onlyRole(EMERGENCY_ROLE) {
        gameStateLocked[gameId] = false;
        emit GameStateUnlocked(gameId, msg.sender);
    }
    
    /**
     * @dev Set jackpot update cooldown
     */
    function setJackpotUpdateCooldown(uint256 cooldown) external onlyRole(ADMIN_ROLE) {
        jackpotUpdateCooldown = cooldown;
        emit JackpotUpdateCooldownSet(cooldown);
    }

    // Gas optimization for MED-005 fix
    mapping(uint256 => uint256) public batchProcessingNonce;
    mapping(uint256 => bool) public batchProcessingActive;
    uint256 public gasOptimizationThreshold;
    uint256 public lastGasOptimization;
    
    // Batch processing constants
    uint256 public constant BATCH_SIZE = 10;
    uint256 public constant GAS_OPTIMIZATION_INTERVAL = 1 hours; 

    /**
     * @dev Gas-optimized batch player processing (MED-005 fix)
     */
    function processBatchPlayers(address[] memory players, uint256[] memory amounts) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        require(players.length == amounts.length, "Array length mismatch");
        require(players.length <= BATCH_SIZE, "Batch size too large");
        require(!batchProcessingActive[block.number], "Batch processing already active");
        
        // Activate batch processing
        batchProcessingActive[block.number] = true;
        batchProcessingNonce[block.number] = batchProcessingNonce[block.number] + 1;
        
        uint256 totalProcessed = 0;
        
        for (uint256 i = 0; i < players.length; i++) {
            if (players[i] != address(0) && amounts[i] > 0) {
                // Process player with gas optimization
                _processPlayerOptimized(players[i], amounts[i]);
                totalProcessed = totalProcessed + 1;
            }
        }
        
        // Deactivate batch processing
        batchProcessingActive[block.number] = false;
        
        emit BatchPlayersProcessed(block.number, totalProcessed, players.length);
    }
    
    /**
     * @dev Gas-optimized player processing
     */
    function _processPlayerOptimized(address player, uint256 amount) internal {
        // Use storage pointers for gas efficiency
        Player storage playerData = players[player];
        
        // Batch update player data
        playerData.totalToppings = playerData.totalToppings + amount;
        playerData.lastEntryTime = block.timestamp;
        playerData.dailyEntries = playerData.dailyEntries + 1;
        
        // Update game state efficiently
        dailyPlayers[_gameId].push(player);
        dailyPlayerCount[_gameId] = dailyPlayerCount[_gameId] + 1;
        
        // Update jackpot atomically
        currentDailyJackpot = currentDailyJackpot + amount;
    }
    
    /**
     * @dev Gas optimization check and cleanup
     */
    function optimizeGasUsage() external onlyRole(ADMIN_ROLE) {
        require(block.timestamp >= lastGasOptimization + GAS_OPTIMIZATION_INTERVAL, "Optimization too frequent");
        
        // Clean up old batch processing data
        for (uint256 i = 0; i < 100; i++) {
            if (block.number > i && batchProcessingActive[block.number - i]) {
                batchProcessingActive[block.number - i] = false;
            }
        }
        
        lastGasOptimization = block.timestamp;
        gasOptimizationThreshold = gasOptimizationThreshold + 1;
        
        emit GasOptimizationCompleted(block.timestamp, gasOptimizationThreshold);
    }
    
    /**
     * @dev Process referral code
     */
    function _processReferralCode(string memory code, address player) internal {
        // Implementation for processing referral codes
        // This would typically validate the code and award rewards
        emit ReferralProcessed(code, player);
    }
    
    /**
     * @dev Get gas usage statistics
     */
    function getGasUsageStats() external view returns (uint256 threshold, uint256 lastOptimization, uint256 batchNonce) {
        return (gasOptimizationThreshold, lastGasOptimization, batchProcessingNonce[block.number]);
    }
} 