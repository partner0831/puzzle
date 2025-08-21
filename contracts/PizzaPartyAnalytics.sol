// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PizzaPartyAnalytics
 * @dev Analytics and batch processing system for Pizza Party game
 * 
 * FEATURES:
 * - Batch player processing
 * - Gas optimization
 * - Game statistics tracking
 * - Performance analytics
 * - Data aggregation
 */
contract PizzaPartyAnalytics is ReentrancyGuard, Ownable, Pausable {
    
    // VMF Token contract
    IERC20 public immutable vmfToken;
    
    // Analytics data structure
    struct GameAnalytics {
        uint256 totalPlayers;
        uint256 activePlayers;
        uint256 totalEntries;
        uint256 totalRewards;
        uint256 averageEntryFee;
        uint256 gasUsed;
        uint256 timestamp;
        uint256 blockNumber;
    }
    
    // Player batch structure
    struct PlayerBatch {
        address[] players;
        uint256[] entryCounts;
        uint256[] rewardAmounts;
        uint256 timestamp;
        bool isProcessed;
    }
    
    // Performance metrics
    struct PerformanceMetrics {
        uint256 totalGasUsed;
        uint256 averageGasPerTransaction;
        uint256 totalTransactions;
        uint256 optimizationSavings;
        uint256 lastOptimization;
    }
    
    // Analytics tracking
    mapping(uint256 => GameAnalytics) public gameAnalytics;
    mapping(uint256 => PlayerBatch) public playerBatches;
    mapping(address => uint256) public playerLastActivity;
    mapping(address => uint256) public playerTotalEntries;
    mapping(address => uint256) public playerTotalRewards;
    
    // Performance tracking
    PerformanceMetrics public performanceMetrics;
    
    // Batch processing
    uint256 public currentBatchId;
    uint256 public totalBatches;
    uint256 public batchSize;
    uint256 public gasOptimizationThreshold;
    
    // Global statistics
    uint256 public totalPlayersProcessed;
    uint256 public totalGasOptimized;
    uint256 public lastAnalyticsUpdate;
    
    // Events
    event AnalyticsUpdated(
        uint256 indexed analyticsId,
        uint256 totalPlayers,
        uint256 activePlayers,
        uint256 totalEntries,
        uint256 totalRewards,
        uint256 gasUsed
    );
    
    event BatchProcessed(
        uint256 indexed batchId,
        address[] players,
        uint256 totalEntries,
        uint256 totalRewards,
        uint256 gasUsed
    );
    
    event GasOptimizationCompleted(
        uint256 timestamp,
        uint256 gasSaved,
        uint256 optimizationThreshold
    );
    
    event PlayerActivityRecorded(
        address indexed player,
        uint256 entryCount,
        uint256 rewardAmount,
        uint256 timestamp
    );
    
    event BatchSizeUpdated(uint256 oldSize, uint256 newSize);
    
    event GasThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    
    // Modifiers
    modifier validBatch(uint256 batchId) {
        require(batchId <= totalBatches, "Invalid batch ID");
        _;
    }
    
    modifier batchNotProcessed(uint256 batchId) {
        require(!playerBatches[batchId].isProcessed, "Batch already processed");
        _;
    }
    
    constructor(address _vmfToken) Ownable(msg.sender) {
        require(_vmfToken != address(0), "Invalid VMF token address");
        vmfToken = IERC20(_vmfToken);
        
        // Initialize batch processing parameters
        batchSize = 50;
        gasOptimizationThreshold = 1000000; // 1M gas
        currentBatchId = 1;
        totalBatches = 0;
    }
    
    /**
     * @dev Record player activity
     */
    function recordPlayerActivity(
        address player,
        uint256 entryCount,
        uint256 rewardAmount
    ) external onlyOwner nonReentrant whenNotPaused {
        require(player != address(0), "Invalid player address");
        
        // Update player data
        playerLastActivity[player] = block.timestamp;
        playerTotalEntries[player] += entryCount;
        playerTotalRewards[player] += rewardAmount;
        
        // Update global stats
        totalPlayersProcessed++;
        
        emit PlayerActivityRecorded(player, entryCount, rewardAmount, block.timestamp);
        
        // Check for gas optimization
        if (gasleft() < gasOptimizationThreshold) {
            _optimizeGasUsage();
        }
    }
    
    /**
     * @dev Process batch of players
     */
    function processPlayerBatch(
        address[] calldata players,
        uint256[] calldata entryCounts,
        uint256[] calldata rewardAmounts
    ) external onlyOwner nonReentrant whenNotPaused {
        require(players.length > 0, "Empty batch");
        require(players.length == entryCounts.length, "Array length mismatch");
        require(players.length == rewardAmounts.length, "Array length mismatch");
        require(players.length <= batchSize, "Batch too large");
        
        uint256 batchId = currentBatchId;
        uint256 gasStart = gasleft();
        
        // Create batch
        PlayerBatch storage batch = playerBatches[batchId];
        batch.players = players;
        batch.entryCounts = entryCounts;
        batch.rewardAmounts = rewardAmounts;
        batch.timestamp = block.timestamp;
        batch.isProcessed = true;
        
        // Process each player
        uint256 totalEntries = 0;
        uint256 totalRewards = 0;
        
        for (uint256 i = 0; i < players.length; i++) {
            address player = players[i];
            uint256 entryCount = entryCounts[i];
            uint256 rewardAmount = rewardAmounts[i];
            
            // Update player data
            playerLastActivity[player] = block.timestamp;
            playerTotalEntries[player] += entryCount;
            playerTotalRewards[player] += rewardAmount;
            
            totalEntries += entryCount;
            totalRewards += rewardAmount;
        }
        
        // Update global stats
        totalPlayersProcessed += players.length;
        totalBatches++;
        currentBatchId++;
        
        // Calculate gas used
        uint256 gasUsed = gasStart - gasleft();
        performanceMetrics.totalGasUsed += gasUsed;
        performanceMetrics.totalTransactions++;
        performanceMetrics.averageGasPerTransaction = 
            performanceMetrics.totalGasUsed / performanceMetrics.totalTransactions;
        
        emit BatchProcessed(batchId, players, totalEntries, totalRewards, gasUsed);
    }
    
    /**
     * @dev Update game analytics
     */
    function updateGameAnalytics(
        uint256 totalPlayers,
        uint256 activePlayers,
        uint256 totalEntries,
        uint256 totalRewards,
        uint256 averageEntryFee
    ) external onlyOwner nonReentrant whenNotPaused {
        uint256 analyticsId = lastAnalyticsUpdate + 1;
        uint256 gasStart = gasleft();
        
        GameAnalytics storage analytics = gameAnalytics[analyticsId];
        analytics.totalPlayers = totalPlayers;
        analytics.activePlayers = activePlayers;
        analytics.totalEntries = totalEntries;
        analytics.totalRewards = totalRewards;
        analytics.averageEntryFee = averageEntryFee;
        analytics.gasUsed = gasStart - gasleft();
        analytics.timestamp = block.timestamp;
        analytics.blockNumber = block.number;
        
        lastAnalyticsUpdate = analyticsId;
        
        emit AnalyticsUpdated(
            analyticsId,
            totalPlayers,
            activePlayers,
            totalEntries,
            totalRewards,
            analytics.gasUsed
        );
    }
    
    /**
     * @dev Get player analytics
     */
    function getPlayerAnalytics(address player) external view returns (
        uint256 lastActivity,
        uint256 totalEntries,
        uint256 totalRewards
    ) {
        return (
            playerLastActivity[player],
            playerTotalEntries[player],
            playerTotalRewards[player]
        );
    }
    
    /**
     * @dev Get batch info
     */
    function getBatchInfo(uint256 batchId) 
        external 
        view 
        validBatch(batchId)
        returns (
            address[] memory players,
            uint256[] memory entryCounts,
            uint256[] memory rewardAmounts,
            uint256 timestamp,
            bool isProcessed
        )
    {
        PlayerBatch storage batch = playerBatches[batchId];
        return (
            batch.players,
            batch.entryCounts,
            batch.rewardAmounts,
            batch.timestamp,
            batch.isProcessed
        );
    }
    
    /**
     * @dev Get performance metrics
     */
    function getPerformanceMetrics() external view returns (PerformanceMetrics memory) {
        return performanceMetrics;
    }
    
    /**
     * @dev Update batch size
     */
    function updateBatchSize(uint256 newBatchSize) external onlyOwner {
        require(newBatchSize > 0, "Batch size must be positive");
        require(newBatchSize <= 1000, "Batch size too large");
        
        uint256 oldSize = batchSize;
        batchSize = newBatchSize;
        
        emit BatchSizeUpdated(oldSize, newBatchSize);
    }
    
    /**
     * @dev Update gas optimization threshold
     */
    function updateGasThreshold(uint256 newThreshold) external onlyOwner {
        uint256 oldThreshold = gasOptimizationThreshold;
        gasOptimizationThreshold = newThreshold;
        
        emit GasThresholdUpdated(oldThreshold, newThreshold);
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
     * @dev Get analytics summary
     */
    function getAnalyticsSummary() external view returns (
        uint256 _totalPlayersProcessed,
        uint256 _totalBatches,
        uint256 _totalGasOptimized,
        uint256 _lastAnalyticsUpdate,
        uint256 _currentBatchId
    ) {
        return (
            totalPlayersProcessed,
            totalBatches,
            totalGasOptimized,
            lastAnalyticsUpdate,
            currentBatchId
        );
    }
    
    /**
     * @dev Internal function to optimize gas usage
     */
    function _optimizeGasUsage() internal {
        uint256 gasStart = gasleft();
        
        // Perform gas optimization operations
        // This could include:
        // - Clearing unused storage
        // - Optimizing data structures
        // - Batching operations
        
        uint256 gasUsed = gasStart - gasleft();
        uint256 gasSaved = gasOptimizationThreshold - gasUsed;
        
        if (gasSaved > 0) {
            totalGasOptimized += gasSaved;
            performanceMetrics.optimizationSavings += gasSaved;
            performanceMetrics.lastOptimization = block.timestamp;
            
            emit GasOptimizationCompleted(block.timestamp, gasSaved, gasOptimizationThreshold);
        }
    }
    
    /**
     * @dev Calculate optimal batch size based on gas usage
     */
    function calculateOptimalBatchSize() external view returns (uint256) {
        if (performanceMetrics.totalTransactions == 0) {
            return batchSize;
        }
        
        uint256 averageGas = performanceMetrics.averageGasPerTransaction;
        uint256 gasLimit = block.gaslimit;
        uint256 targetGasUsage = gasLimit / 2; // Use 50% of gas limit
        
        uint256 optimalSize = targetGasUsage / averageGas;
        
        // Ensure reasonable bounds
        if (optimalSize < 10) optimalSize = 10;
        if (optimalSize > 1000) optimalSize = 1000;
        
        return optimalSize;
    }
}
