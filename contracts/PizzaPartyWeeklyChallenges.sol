// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PizzaPartyWeeklyChallenges
 * @dev Weekly challenges system for Pizza Party game
 * 
 * FEATURES:
 * - Weekly challenge creation and management
 * - Challenge completion tracking
 * - Reward distribution
 * - Challenge leaderboards
 * - Challenge categories and difficulty levels
 */
contract PizzaPartyWeeklyChallenges is ReentrancyGuard, Ownable, Pausable {
    
    // VMF Token contract
    IERC20 public immutable vmfToken;
    
    // Challenge structure
    struct Challenge {
        uint256 challengeId;
        string title;
        string description;
        uint256 rewardAmount;
        uint256 difficulty;
        uint256 startTime;
        uint256 endTime;
        uint256 maxParticipants;
        uint256 currentParticipants;
        bool isActive;
        bool isCompleted;
        string category;
        mapping(address => bool) participants;
        mapping(address => bool) completions;
        address[] participantList;
    }
    
    // User challenge data
    struct UserChallengeData {
        uint256 totalChallengesCompleted;
        uint256 totalRewardsEarned;
        uint256 currentStreak;
        uint256 longestStreak;
        uint256 lastCompletionTime;
        uint256 reputation;
        bool isActive;
    }
    
    // Challenge completion structure
    struct ChallengeCompletion {
        uint256 challengeId;
        address player;
        uint256 completionTime;
        uint256 rewardAmount;
        string proof;
        bool isVerified;
    }
    
    // System constants
    uint256 public constant CHALLENGE_DURATION = 7 days;
    uint256 public constant MIN_REWARD_AMOUNT = 10 * 10**18; // 10 VMF
    uint256 public constant MAX_REWARD_AMOUNT = 1000 * 10**18; // 1000 VMF
    uint256 public constant MAX_PARTICIPANTS = 1000;
    uint256 public constant STREAK_BONUS_MULTIPLIER = 10; // 10% bonus per streak week
    
    // Challenge tracking
    mapping(uint256 => Challenge) public challenges;
    uint256 public currentChallengeId;
    uint256 public totalChallenges;
    
    // User tracking
    mapping(address => UserChallengeData) public userChallengeData;
    mapping(address => ChallengeCompletion[]) public userCompletions;
    mapping(address => bool) public blacklistedUsers;
    
    // Category tracking
    mapping(string => uint256) public categoryChallengeCount;
    string[] public challengeCategories;
    
    // Global statistics
    uint256 public totalChallengesCompleted;
    uint256 public totalRewardsDistributed;
    uint256 public totalParticipants;
    uint256 public activeUsers;
    
    // Events
    event ChallengeCreated(
        uint256 indexed challengeId,
        string title,
        string category,
        uint256 rewardAmount,
        uint256 difficulty,
        uint256 startTime,
        uint256 endTime
    );
    
    event ChallengeJoined(
        uint256 indexed challengeId,
        address indexed player,
        uint256 timestamp
    );
    
    event ChallengeCompleted(
        uint256 indexed challengeId,
        address indexed player,
        uint256 rewardAmount,
        uint256 completionTime
    );
    
    event WeeklyChallengeCompleted(
        address indexed player,
        uint256 challengeId,
        uint256 reward,
        uint256 streak
    );
    
    event StreakUpdated(
        address indexed player,
        uint256 oldStreak,
        uint256 newStreak,
        uint256 bonusAmount
    );
    
    event CategoryCreated(string category);
    
    event UserBlacklisted(address indexed user, bool blacklisted);
    
    // Modifiers
    modifier notBlacklisted(address user) {
        require(!blacklistedUsers[user], "User is blacklisted");
        _;
    }
    
    modifier challengeExists(uint256 challengeId) {
        require(challengeId <= totalChallenges, "Challenge does not exist");
        _;
    }
    
    modifier challengeActive(uint256 challengeId) {
        require(challenges[challengeId].isActive, "Challenge is not active");
        require(block.timestamp >= challenges[challengeId].startTime, "Challenge not started");
        require(block.timestamp <= challenges[challengeId].endTime, "Challenge ended");
        _;
    }
    
    modifier notParticipated(uint256 challengeId, address player) {
        require(!challenges[challengeId].participants[player], "Already participated");
        _;
    }
    
    modifier notCompleted(uint256 challengeId, address player) {
        require(!challenges[challengeId].completions[player], "Already completed");
        _;
    }
    
    constructor(address _vmfToken) Ownable(msg.sender) {
        require(_vmfToken != address(0), "Invalid VMF token address");
        vmfToken = IERC20(_vmfToken);
        
        currentChallengeId = 1;
        totalChallenges = 0;
        
        // Initialize default categories
        _createDefaultCategories();
    }
    
    /**
     * @dev Create a new weekly challenge
     */
    function createChallenge(
        string memory title,
        string memory description,
        uint256 rewardAmount,
        uint256 difficulty,
        string memory category,
        uint256 maxParticipants
    ) external onlyOwner whenNotPaused {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(rewardAmount >= MIN_REWARD_AMOUNT, "Reward too low");
        require(rewardAmount <= MAX_REWARD_AMOUNT, "Reward too high");
        require(difficulty >= 1 && difficulty <= 5, "Invalid difficulty");
        require(maxParticipants > 0 && maxParticipants <= MAX_PARTICIPANTS, "Invalid max participants");
        
        uint256 challengeId = currentChallengeId;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + CHALLENGE_DURATION;
        
        Challenge storage challenge = challenges[challengeId];
        challenge.challengeId = challengeId;
        challenge.title = title;
        challenge.description = description;
        challenge.rewardAmount = rewardAmount;
        challenge.difficulty = difficulty;
        challenge.startTime = startTime;
        challenge.endTime = endTime;
        challenge.maxParticipants = maxParticipants;
        challenge.currentParticipants = 0;
        challenge.isActive = true;
        challenge.isCompleted = false;
        challenge.category = category;
        
        currentChallengeId++;
        totalChallenges++;
        
        // Update category count
        if (categoryChallengeCount[category] == 0) {
            challengeCategories.push(category);
        }
        categoryChallengeCount[category]++;
        
        emit ChallengeCreated(
            challengeId,
            title,
            category,
            rewardAmount,
            difficulty,
            startTime,
            endTime
        );
    }
    
    /**
     * @dev Join a challenge
     */
    function joinChallenge(uint256 challengeId) 
        external 
        nonReentrant 
        whenNotPaused 
        challengeExists(challengeId)
        challengeActive(challengeId)
        notParticipated(challengeId, msg.sender)
        notBlacklisted(msg.sender)
    {
        Challenge storage challenge = challenges[challengeId];
        
        require(challenge.currentParticipants < challenge.maxParticipants, "Challenge full");
        
        // Record participation
        challenge.participants[msg.sender] = true;
        challenge.participantList.push(msg.sender);
        challenge.currentParticipants++;
        
        // Update user data
        UserChallengeData storage userData = userChallengeData[msg.sender];
        if (!userData.isActive) {
            userData.isActive = true;
            totalParticipants++;
            activeUsers++;
        }
        
        emit ChallengeJoined(challengeId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Complete a challenge
     */
    function completeChallenge(uint256 challengeId, string memory proof) 
        external 
        nonReentrant 
        whenNotPaused 
        challengeExists(challengeId)
        challengeActive(challengeId)
        notCompleted(challengeId, msg.sender)
    {
        require(challenges[challengeId].participants[msg.sender], "Not participating");
        
        Challenge storage challenge = challenges[challengeId];
        
        // Record completion
        challenge.completions[msg.sender] = true;
        
        // Calculate reward with streak bonus
        uint256 baseReward = challenge.rewardAmount;
        uint256 streakBonus = _calculateStreakBonus(msg.sender);
        uint256 totalReward = baseReward + streakBonus;
        
        // Update user data
        UserChallengeData storage userData = userChallengeData[msg.sender];
        userData.totalChallengesCompleted++;
        userData.totalRewardsEarned += totalReward;
        userData.lastCompletionTime = block.timestamp;
        userData.reputation += challenge.difficulty;
        
        // Update streak
        _updateStreak(msg.sender);
        
        // Update global stats
        totalChallengesCompleted++;
        totalRewardsDistributed += totalReward;
        
        // Record completion
        ChallengeCompletion memory completion = ChallengeCompletion({
            challengeId: challengeId,
            player: msg.sender,
            completionTime: block.timestamp,
            rewardAmount: totalReward,
            proof: proof,
            isVerified: true
        });
        
        userCompletions[msg.sender].push(completion);
        
        // Transfer reward
        require(vmfToken.transfer(msg.sender, totalReward), "Reward transfer failed");
        
        emit ChallengeCompleted(challengeId, msg.sender, totalReward, block.timestamp);
        emit WeeklyChallengeCompleted(msg.sender, challengeId, totalReward, userData.currentStreak);
    }
    
    /**
     * @dev Get challenge info
     */
    function getChallengeInfo(uint256 challengeId) 
        external 
        view 
        challengeExists(challengeId)
        returns (
            string memory title,
            string memory description,
            uint256 rewardAmount,
            uint256 difficulty,
            uint256 startTime,
            uint256 endTime,
            uint256 maxParticipants,
            uint256 currentParticipants,
            bool isActive,
            bool isCompleted,
            string memory category
        )
    {
        Challenge storage challenge = challenges[challengeId];
        return (
            challenge.title,
            challenge.description,
            challenge.rewardAmount,
            challenge.difficulty,
            challenge.startTime,
            challenge.endTime,
            challenge.maxParticipants,
            challenge.currentParticipants,
            challenge.isActive,
            challenge.isCompleted,
            challenge.category
        );
    }
    
    /**
     * @dev Get user challenge data
     */
    function getUserChallengeData(address user) external view returns (UserChallengeData memory) {
        return userChallengeData[user];
    }
    
    /**
     * @dev Get user completions
     */
    function getUserCompletions(address user, uint256 startIndex, uint256 count) 
        external 
        view 
        returns (ChallengeCompletion[] memory)
    {
        ChallengeCompletion[] storage completions = userCompletions[user];
        require(startIndex < completions.length, "Invalid start index");
        
        uint256 endIndex = startIndex + count;
        if (endIndex > completions.length) {
            endIndex = completions.length;
        }
        
        ChallengeCompletion[] memory result = new ChallengeCompletion[](endIndex - startIndex);
        
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = completions[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get challenge participants
     */
    function getChallengeParticipants(uint256 challengeId) 
        external 
        view 
        challengeExists(challengeId)
        returns (address[] memory)
    {
        return challenges[challengeId].participantList;
    }
    
    /**
     * @dev Get challenge categories
     */
    function getChallengeCategories() external view returns (string[] memory) {
        return challengeCategories;
    }
    
    /**
     * @dev Update challenge status
     */
    function updateChallengeStatus(uint256 challengeId, bool isActive) 
        external 
        onlyOwner 
        challengeExists(challengeId)
    {
        challenges[challengeId].isActive = isActive;
    }
    
    /**
     * @dev Blacklist/unblacklist user
     */
    function setUserBlacklist(address user, bool blacklisted) external onlyOwner {
        blacklistedUsers[user] = blacklisted;
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
     * @dev Internal function to create default categories
     */
    function _createDefaultCategories() internal {
        challengeCategories.push("Daily");
        challengeCategories.push("Weekly");
        challengeCategories.push("Social");
        challengeCategories.push("Trading");
        challengeCategories.push("Community");
        
        for (uint256 i = 0; i < challengeCategories.length; i++) {
            categoryChallengeCount[challengeCategories[i]] = 0;
            emit CategoryCreated(challengeCategories[i]);
        }
    }
    
    /**
     * @dev Internal function to calculate streak bonus
     */
    function _calculateStreakBonus(address user) internal view returns (uint256) {
        UserChallengeData storage userData = userChallengeData[user];
        uint256 streak = userData.currentStreak;
        
        if (streak == 0) return 0;
        
        // 10% bonus per week of streak
        uint256 bonusPercentage = streak * STREAK_BONUS_MULTIPLIER;
        return (challenges[currentChallengeId - 1].rewardAmount * bonusPercentage) / 100;
    }
    
    /**
     * @dev Internal function to update streak
     */
    function _updateStreak(address user) internal {
        UserChallengeData storage userData = userChallengeData[user];
        uint256 currentTime = block.timestamp;
        uint256 lastCompletion = userData.lastCompletionTime;
        
        // Check if completion is within 7 days of last completion
        if (currentTime - lastCompletion <= CHALLENGE_DURATION) {
            userData.currentStreak++;
            if (userData.currentStreak > userData.longestStreak) {
                userData.longestStreak = userData.currentStreak;
            }
        } else {
            userData.currentStreak = 1;
        }
        
        userData.lastCompletionTime = currentTime;
    }
}
