// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PizzaPartyLoyalty
 * @dev Loyalty points system for Pizza Party game
 * 
 * FEATURES:
 * - Earn loyalty points for game participation
 * - Point redemption for rewards
 * - Tier-based loyalty system
 * - Point expiration management
 * - Loyalty analytics
 */
contract PizzaPartyLoyalty is ReentrancyGuard, Ownable, Pausable {
    
    // VMF Token contract
    IERC20 public immutable vmfToken;
    
    // Loyalty tier structure
    struct LoyaltyTier {
        string name;
        uint256 minPoints;
        uint256 maxPoints;
        uint256 rewardMultiplier;
        uint256 bonusRewards;
        bool isActive;
    }
    
    // User loyalty data
    struct UserLoyaltyData {
        uint256 totalPoints;
        uint256 currentTier;
        uint256 pointsEarned;
        uint256 pointsRedeemed;
        uint256 lastActivity;
        uint256 streakDays;
        uint256 totalRewards;
        bool isActive;
    }
    
    // Point transaction structure
    struct PointTransaction {
        uint256 timestamp;
        uint256 points;
        string reason;
        bool isEarned;
        uint256 tierAtTime;
    }
    
    // System constants
    uint256 public constant POINTS_PER_DOLLAR = 10; // 10 points per $1 spent
    uint256 public constant POINTS_PER_ENTRY = 5; // 5 points per game entry
    uint256 public constant STREAK_BONUS = 2; // 2 extra points per day in streak
    uint256 public constant MAX_STREAK_DAYS = 30; // Maximum streak bonus days
    uint256 public constant POINT_EXPIRY_DAYS = 365; // Points expire after 1 year
    
    // Loyalty tiers
    mapping(uint256 => LoyaltyTier) public loyaltyTiers;
    uint256 public tierCount;
    
    // User data
    mapping(address => UserLoyaltyData) public userLoyaltyData;
    mapping(address => PointTransaction[]) public userTransactions;
    mapping(address => bool) public blacklistedUsers;
    
    // Global tracking
    uint256 public totalPointsIssued;
    uint256 public totalPointsRedeemed;
    uint256 public totalUsers;
    uint256 public activeUsers;
    
    // Events
    event PointsEarned(
        address indexed user,
        uint256 points,
        string reason,
        uint256 newTotal,
        uint256 tier
    );
    
    event PointsRedeemed(
        address indexed user,
        uint256 points,
        uint256 rewardAmount,
        uint256 newTotal
    );
    
    event LoyaltyTierUpdated(
        address indexed user,
        uint256 oldTier,
        uint256 newTier,
        string tierName
    );
    
    event StreakUpdated(
        address indexed user,
        uint256 oldStreak,
        uint256 newStreak,
        uint256 bonusPoints
    );
    
    event TierCreated(
        uint256 tierId,
        string name,
        uint256 minPoints,
        uint256 maxPoints,
        uint256 rewardMultiplier
    );
    
    event UserBlacklisted(address indexed user, bool blacklisted);
    
    // Modifiers
    modifier notBlacklisted(address user) {
        require(!blacklistedUsers[user], "User is blacklisted");
        _;
    }
    
    modifier validTier(uint256 tierId) {
        require(tierId < tierCount, "Invalid tier ID");
        require(loyaltyTiers[tierId].isActive, "Tier is not active");
        _;
    }
    
    constructor(address _vmfToken) Ownable(msg.sender) {
        require(_vmfToken != address(0), "Invalid VMF token address");
        vmfToken = IERC20(_vmfToken);
        
        // Initialize default tiers
        _createDefaultTiers();
    }
    
    /**
     * @dev Award loyalty points to user
     */
    function awardLoyaltyPoints(
        address user,
        uint256 points,
        string memory reason
    ) external onlyOwner nonReentrant whenNotPaused notBlacklisted(user) {
        require(points > 0, "Points must be positive");
        require(user != address(0), "Invalid user address");
        
        UserLoyaltyData storage userData = userLoyaltyData[user];
        
        // Update user data
        userData.totalPoints += points;
        userData.pointsEarned += points;
        userData.lastActivity = block.timestamp;
        
        // Check for new user
        if (!userData.isActive) {
            userData.isActive = true;
            totalUsers++;
            activeUsers++;
        }
        
        // Update tier
        uint256 oldTier = userData.currentTier;
        uint256 newTier = _calculateTier(userData.totalPoints);
        userData.currentTier = newTier;
        
        // Update global stats
        totalPointsIssued += points;
        
        // Record transaction
        _recordTransaction(user, points, reason, true, newTier);
        
        // Emit events
        emit PointsEarned(user, points, reason, userData.totalPoints, newTier);
        
        if (oldTier != newTier) {
            emit LoyaltyTierUpdated(user, oldTier, newTier, loyaltyTiers[newTier].name);
        }
    }
    
    /**
     * @dev Award points for game entry
     */
    function awardEntryPoints(address user) external onlyOwner {
        require(user != address(0), "Invalid user address");
        
        uint256 basePoints = POINTS_PER_ENTRY;
        uint256 streakBonus = _calculateStreakBonus(user);
        uint256 totalPoints = basePoints + streakBonus;
        
        this.awardLoyaltyPoints(user, totalPoints, "Game Entry");
        
        // Update streak
        _updateStreak(user);
    }
    
    /**
     * @dev Award points for VMF spent
     */
    function awardSpendingPoints(address user, uint256 vmfAmount, uint256 vmfPrice) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(vmfAmount > 0, "Amount must be positive");
        require(vmfPrice > 0, "Price must be positive");
        
        // Calculate USD value
        uint256 usdValue = (vmfAmount * vmfPrice) / 10**18;
        
        // Calculate points based on USD value
        uint256 points = (usdValue * POINTS_PER_DOLLAR) / 10**18;
        
        if (points > 0) {
            this.awardLoyaltyPoints(user, points, "VMF Spending");
        }
    }
    
    /**
     * @dev Redeem points for VMF rewards
     */
    function redeemPoints(uint256 points) external nonReentrant whenNotPaused notBlacklisted(msg.sender) {
        require(points > 0, "Points must be positive");
        
        UserLoyaltyData storage userData = userLoyaltyData[msg.sender];
        require(userData.totalPoints >= points, "Insufficient points");
        
        // Calculate reward amount
        uint256 rewardAmount = _calculateRewardAmount(msg.sender, points);
        
        // Update user data
        userData.totalPoints -= points;
        userData.pointsRedeemed += points;
        userData.totalRewards += rewardAmount;
        
        // Update tier
        uint256 oldTier = userData.currentTier;
        uint256 newTier = _calculateTier(userData.totalPoints);
        userData.currentTier = newTier;
        
        // Update global stats
        totalPointsRedeemed += points;
        
        // Transfer reward
        require(vmfToken.transfer(msg.sender, rewardAmount), "Reward transfer failed");
        
        // Record transaction
        _recordTransaction(msg.sender, points, "Points Redemption", false, newTier);
        
        // Emit events
        emit PointsRedeemed(msg.sender, points, rewardAmount, userData.totalPoints);
        
        if (oldTier != newTier) {
            emit LoyaltyTierUpdated(msg.sender, oldTier, newTier, loyaltyTiers[newTier].name);
        }
    }
    
    /**
     * @dev Create new loyalty tier
     */
    function createLoyaltyTier(
        string memory name,
        uint256 minPoints,
        uint256 maxPoints,
        uint256 rewardMultiplier,
        uint256 bonusRewards
    ) external onlyOwner {
        require(bytes(name).length > 0, "Tier name cannot be empty");
        require(minPoints < maxPoints, "Invalid point range");
        require(rewardMultiplier > 0, "Reward multiplier must be positive");
        
        loyaltyTiers[tierCount] = LoyaltyTier({
            name: name,
            minPoints: minPoints,
            maxPoints: maxPoints,
            rewardMultiplier: rewardMultiplier,
            bonusRewards: bonusRewards,
            isActive: true
        });
        
        emit TierCreated(tierCount, name, minPoints, maxPoints, rewardMultiplier);
        tierCount++;
    }
    
    /**
     * @dev Update loyalty tier
     */
    function updateLoyaltyTier(
        uint256 tierId,
        string memory name,
        uint256 minPoints,
        uint256 maxPoints,
        uint256 rewardMultiplier,
        uint256 bonusRewards,
        bool isActive
    ) external onlyOwner validTier(tierId) {
        loyaltyTiers[tierId] = LoyaltyTier({
            name: name,
            minPoints: minPoints,
            maxPoints: maxPoints,
            rewardMultiplier: rewardMultiplier,
            bonusRewards: bonusRewards,
            isActive: isActive
        });
    }
    
    /**
     * @dev Get user loyalty data
     */
    function getUserLoyaltyData(address user) external view returns (UserLoyaltyData memory) {
        return userLoyaltyData[user];
    }
    
    /**
     * @dev Get user transactions
     */
    function getUserTransactions(address user, uint256 startIndex, uint256 count) 
        external 
        view 
        returns (PointTransaction[] memory)
    {
        PointTransaction[] storage transactions = userTransactions[user];
        require(startIndex < transactions.length, "Invalid start index");
        
        uint256 endIndex = startIndex + count;
        if (endIndex > transactions.length) {
            endIndex = transactions.length;
        }
        
        PointTransaction[] memory result = new PointTransaction[](endIndex - startIndex);
        
        for (uint256 i = startIndex; i < endIndex; i++) {
            result[i - startIndex] = transactions[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get loyalty tier info
     */
    function getLoyaltyTier(uint256 tierId) external view validTier(tierId) returns (LoyaltyTier memory) {
        return loyaltyTiers[tierId];
    }
    
    /**
     * @dev Calculate reward amount for points
     */
    function calculateRewardAmount(address user, uint256 points) external view returns (uint256) {
        return _calculateRewardAmount(user, points);
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
     * @dev Internal function to create default tiers
     */
    function _createDefaultTiers() internal {
        // Bronze Tier
        loyaltyTiers[0] = LoyaltyTier({
            name: "Bronze",
            minPoints: 0,
            maxPoints: 999,
            rewardMultiplier: 100, // 1.0x
            bonusRewards: 0,
            isActive: true
        });
        
        // Silver Tier
        loyaltyTiers[1] = LoyaltyTier({
            name: "Silver",
            minPoints: 1000,
            maxPoints: 4999,
            rewardMultiplier: 120, // 1.2x
            bonusRewards: 10,
            isActive: true
        });
        
        // Gold Tier
        loyaltyTiers[2] = LoyaltyTier({
            name: "Gold",
            minPoints: 5000,
            maxPoints: 19999,
            rewardMultiplier: 150, // 1.5x
            bonusRewards: 25,
            isActive: true
        });
        
        // Platinum Tier
        loyaltyTiers[3] = LoyaltyTier({
            name: "Platinum",
            minPoints: 20000,
            maxPoints: type(uint256).max,
            rewardMultiplier: 200, // 2.0x
            bonusRewards: 50,
            isActive: true
        });
        
        tierCount = 4;
    }
    
    /**
     * @dev Internal function to calculate tier
     */
    function _calculateTier(uint256 points) internal view returns (uint256) {
        for (uint256 i = 0; i < tierCount; i++) {
            if (loyaltyTiers[i].isActive && 
                points >= loyaltyTiers[i].minPoints && 
                points <= loyaltyTiers[i].maxPoints) {
                return i;
            }
        }
        return 0; // Default to Bronze
    }
    
    /**
     * @dev Internal function to calculate reward amount
     */
    function _calculateRewardAmount(address user, uint256 points) internal view returns (uint256) {
        UserLoyaltyData storage userData = userLoyaltyData[user];
        uint256 tier = userData.currentTier;
        
        if (tier >= tierCount || !loyaltyTiers[tier].isActive) {
            tier = 0; // Default to Bronze
        }
        
        LoyaltyTier storage currentTier = loyaltyTiers[tier];
        
        // Base reward: 1 VMF per 100 points
        uint256 baseReward = (points * 10**18) / 100;
        
        // Apply tier multiplier
        uint256 tierReward = (baseReward * currentTier.rewardMultiplier) / 100;
        
        // Add bonus rewards
        uint256 bonusReward = currentTier.bonusRewards * 10**18;
        
        return tierReward + bonusReward;
    }
    
    /**
     * @dev Internal function to calculate streak bonus
     */
    function _calculateStreakBonus(address user) internal view returns (uint256) {
        UserLoyaltyData storage userData = userLoyaltyData[user];
        uint256 streakDays = userData.streakDays;
        
        if (streakDays > MAX_STREAK_DAYS) {
            streakDays = MAX_STREAK_DAYS;
        }
        
        return streakDays * STREAK_BONUS;
    }
    
    /**
     * @dev Internal function to update streak
     */
    function _updateStreak(address user) internal {
        UserLoyaltyData storage userData = userLoyaltyData[user];
        uint256 currentTime = block.timestamp;
        uint256 lastActivity = userData.lastActivity;
        
        // Check if activity is within 24 hours
        if (currentTime - lastActivity <= 1 days) {
            userData.streakDays++;
            if (userData.streakDays > MAX_STREAK_DAYS) {
                userData.streakDays = MAX_STREAK_DAYS;
            }
        } else {
            userData.streakDays = 1;
        }
        
        userData.lastActivity = currentTime;
    }
    
    /**
     * @dev Internal function to record transaction
     */
    function _recordTransaction(
        address user,
        uint256 points,
        string memory reason,
        bool isEarned,
        uint256 tier
    ) internal {
        PointTransaction memory transaction = PointTransaction({
            timestamp: block.timestamp,
            points: points,
            reason: reason,
            isEarned: isEarned,
            tierAtTime: tier
        });
        
        userTransactions[user].push(transaction);
    }
}
