// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./IPizzaParty.sol";

/**
 * @title PizzaPartyCore
 * @dev Core Pizza Party game contract with proper topping system and weekly jackpot calculation
 * This is a simplified version to stay under the 24,576 byte limit
 */
contract PizzaPartyCore is ReentrancyGuard, Ownable, Pausable, IPizzaParty {
    
    // VMF Token contract
    IERC20 public immutable vmfToken;
    
    // Game constants
    uint256 public constant DAILY_WINNERS_COUNT = 8;
    uint256 public constant WEEKLY_WINNERS_COUNT = 10;
    uint256 public constant DAILY_PLAY_REWARD = 1; // 1 topping per day played
    uint256 public constant REFERRAL_REWARD = 2; // 2 toppings per referral
    uint256 public constant VMF_HOLDING_REWARD = 3; // 3 toppings per 10 VMF
    uint256 public constant VMF_HOLDING_THRESHOLD = 10 * 10**18; // 10 VMF threshold
    uint256 public constant MAX_DAILY_ENTRIES = 10;
    uint256 public constant ENTRY_COOLDOWN = 1 hours;
    uint256 public constant MIN_VMF_REQUIRED = 100 * 10**18; // 100 VMF minimum
    uint256 public constant VMF_PER_TOPPING = 1 * 10**18; // 1 VMF per topping for jackpot
    
    // Game state
    uint256 private _gameId;
    uint256 public currentDailyJackpot;
    uint256 public lastDailyDraw;
    uint256 public lastWeeklyDraw;
    uint256 public totalToppingsClaimed; // Total toppings across all players
    uint256 public weeklyToppingsPool; // Toppings for current week
    
    // Player tracking
    mapping(uint256 => address[]) public dailyPlayers;
    mapping(uint256 => uint256) public dailyPlayerCount;
    mapping(uint256 => address[]) public weeklyPlayers;
    mapping(uint256 => uint256) public weeklyPlayerCount;
    
    // Player data
    struct Player {
        uint256 totalToppings;
        uint256 dailyEntries;
        uint256 weeklyEntries;
        uint256 lastEntryTime;
        uint256 vmfBalance;
        uint256 lastVmfBalanceCheck; // Track when VMF balance was last checked for toppings
        uint256 referrals; // Number of successful referrals
        bool isBlacklisted;
    }
    
    // Mappings
    mapping(address => Player) public players;
    mapping(address => bool) public blacklistedAddresses;
    mapping(address => address) public referrers; // Who referred this player
    mapping(address => uint256) public referralCount; // How many people this player referred
    
    // Events
    event PlayerEntered(address indexed player, uint256 indexed gameId, uint256 amount);
    event JackpotUpdated(uint256 dailyJackpot, uint256 weeklyJackpot);
    event ToppingsAwarded(address indexed player, uint256 amount, string reason);
    event DailyWinnersSelected(uint256 gameId, address[] winners, uint256 jackpot);
    event WeeklyWinnersSelected(uint256 gameId, address[] winners, uint256 jackpot);
    event PlayerBlacklisted(address indexed player, bool blacklisted);
    event ReferralRegistered(address indexed referrer, address indexed referred);
    
    // Modifiers
    modifier notBlacklisted(address player) {
        require(!blacklistedAddresses[player], "Player is blacklisted");
        require(!players[player].isBlacklisted, "Player is blacklisted");
        _;
    }
    
    modifier rateLimited() {
        require(block.timestamp >= players[msg.sender].lastEntryTime + ENTRY_COOLDOWN, "Rate limit exceeded");
        _;
    }
    
    constructor(address _vmfToken) Ownable(msg.sender) {
        require(_vmfToken != address(0), "Invalid VMF token address");
        vmfToken = IERC20(_vmfToken);
        
        // Initialize game state
        _gameId = 1;
        _startNewDailyGame();
    }
    
    /**
     * @dev Enter daily game with optional referral
     */
    function enterDailyGame(address referrer) external nonReentrant whenNotPaused notBlacklisted(msg.sender) rateLimited {
        // Check VMF balance
        uint256 vmfBalance = vmfToken.balanceOf(msg.sender);
        require(vmfBalance >= MIN_VMF_REQUIRED, "Insufficient VMF balance");
        
        // Check daily entry limit
        require(players[msg.sender].dailyEntries < MAX_DAILY_ENTRIES, "Max daily entries reached");
        
        // Process referral if provided and valid
        if (referrer != address(0) && referrer != msg.sender && referrers[msg.sender] == address(0)) {
            _processReferral(msg.sender, referrer);
        }
        
        // Update player data
        players[msg.sender].dailyEntries = players[msg.sender].dailyEntries + 1;
        players[msg.sender].lastEntryTime = block.timestamp;
        players[msg.sender].vmfBalance = vmfBalance;
        
        // Award toppings for daily play
        _awardToppings(msg.sender, DAILY_PLAY_REWARD, "Daily play reward");
        
        // Award toppings for VMF holdings
        _awardVmfHoldingToppings(msg.sender, vmfBalance);
        
        // Add player to current game
        dailyPlayers[_gameId].push(msg.sender);
        dailyPlayerCount[_gameId] = dailyPlayerCount[_gameId] + 1;
        
        // Emit events
        emit PlayerEntered(msg.sender, _gameId, 0);
        emit JackpotUpdated(currentDailyJackpot, getWeeklyJackpot());
    }
    
    /**
     * @dev Process referral and award toppings
     */
    function _processReferral(address referred, address referrer) internal {
        // Check if referrer is valid (has played before)
        require(players[referrer].dailyEntries > 0, "Invalid referrer");
        
        // Register referral
        referrers[referred] = referrer;
        referralCount[referrer] = referralCount[referrer] + 1;
        players[referrer].referrals = players[referrer].referrals + 1;
        
        // Award toppings to referrer
        _awardToppings(referrer, REFERRAL_REWARD, "Referral reward");
        
        emit ReferralRegistered(referrer, referred);
    }
    
    /**
     * @dev Award toppings to player
     */
    function _awardToppings(address player, uint256 amount, string memory reason) internal {
        players[player].totalToppings = players[player].totalToppings + amount;
        totalToppingsClaimed = totalToppingsClaimed + amount;
        weeklyToppingsPool = weeklyToppingsPool + amount;
        
        emit ToppingsAwarded(player, amount, reason);
    }
    
    /**
     * @dev Award toppings based on VMF holdings
     */
    function _awardVmfHoldingToppings(address player, uint256 vmfBalance) internal {
        // Only check once per day to avoid spam
        if (block.timestamp >= players[player].lastVmfBalanceCheck + 1 days) {
            uint256 vmfHoldingToppings = (vmfBalance / VMF_HOLDING_THRESHOLD) * VMF_HOLDING_REWARD;
            
            if (vmfHoldingToppings > 0) {
                _awardToppings(player, vmfHoldingToppings, "VMF holding reward");
            }
            
            players[player].lastVmfBalanceCheck = block.timestamp;
        }
    }
    
    /**
     * @dev Process daily winners selected by VRF
     */
    function processDailyWinners(uint256 gameId, address[] calldata winners) external override {
        require(msg.sender == owner(), "Only owner can call this");
        require(winners.length > 0, "No winners provided");
        
        // Distribute jackpot to winners
        uint256 prizePerWinner = currentDailyJackpot / winners.length;
        
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] != address(0)) {
                // Transfer VMF tokens to winner
                require(vmfToken.transfer(winners[i], prizePerWinner), "Transfer failed");
                
                // Award toppings to winner
                _awardToppings(winners[i], 10, "Daily winner bonus");
            }
        }
        
        emit DailyWinnersSelected(gameId, winners, currentDailyJackpot);
        
        // Reset for next game
        _startNewDailyGame();
    }
    
    /**
     * @dev Process weekly winners selected by VRF
     */
    function processWeeklyWinners(uint256 gameId, address[] calldata winners) external override {
        require(msg.sender == owner(), "Only owner can call this");
        require(winners.length > 0, "No winners provided");
        
        // Calculate weekly jackpot based on toppings
        uint256 weeklyJackpot = getWeeklyJackpot();
        
        // Distribute jackpot to winners
        uint256 prizePerWinner = weeklyJackpot / winners.length;
        
        for (uint256 i = 0; i < winners.length; i++) {
            if (winners[i] != address(0)) {
                // Transfer VMF tokens to winner
                require(vmfToken.transfer(winners[i], prizePerWinner), "VMF prize transfer failed");
            }
        }
        
        emit WeeklyWinnersSelected(gameId, winners, weeklyJackpot);
        
        // Reset weekly game
        _resetWeeklyGame();
    }
    
    /**
     * @dev Get eligible players for daily draw
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
     */
    function getEligibleWeeklyPlayers(uint256 gameId) external view override returns (address[] memory eligiblePlayers) {
        uint256 playerCount = weeklyPlayerCount[gameId];
        eligiblePlayers = new address[](playerCount);
        
        for (uint256 i = 0; i < playerCount; i++) {
            eligiblePlayers[i] = weeklyPlayers[gameId][i];
        }
        
        return eligiblePlayers;
    }
    
    /**
     * @dev Get current game ID
     */
    function getCurrentGameId() external view override returns (uint256 gameId) {
        return _gameId;
    }
    
    /**
     * @dev Check if daily draw is ready
     */
    function isDailyDrawReady() external view override returns (bool ready) {
        return block.timestamp >= lastDailyDraw + 1 days;
    }
    
    /**
     * @dev Check if weekly draw is ready
     */
    function isWeeklyDrawReady() external view override returns (bool ready) {
        return block.timestamp >= lastWeeklyDraw + 7 days;
    }
    
    /**
     * @dev Get daily jackpot amount
     */
    function getDailyJackpot() external view returns (uint256) {
        return currentDailyJackpot;
    }
    
    /**
      * @dev Get weekly jackpot amount - calculated from toppings
 * Weekly Jackpot = Total Toppings × 1 VMF per topping
 */
function getWeeklyJackpot() public view returns (uint256) {
  return weeklyToppingsPool * VMF_PER_TOPPING;
}
    
    /**
     * @dev Get player toppings
     */
    function getPlayerToppings(address player) external view returns (uint256) {
        return players[player].totalToppings;
    }
    
    /**
     * @dev Get total toppings claimed
     */
    function getTotalToppingsClaimed() external view returns (uint256) {
        return totalToppingsClaimed;
    }
    
    /**
     * @dev Get weekly toppings pool
     */
    function getWeeklyToppingsPool() external view returns (uint256) {
        return weeklyToppingsPool;
    }
    
    /**
     * @dev Get player VMF balance
     */
    function getPlayerVMFBalance(address player) external view returns (uint256) {
        return players[player].vmfBalance;
    }
    
    /**
     * @dev Get minimum VMF required
     */
    function getMinimumVMFRequired() external view returns (uint256) {
        return MIN_VMF_REQUIRED;
    }
    
    /**
     * @dev Get player referral info
     */
    function getPlayerReferralInfo(address player) external view returns (uint256 referrals, address referrer) {
        return (players[player].referrals, referrers[player]);
    }
    
    /**
     * @dev Add to daily jackpot (for testing)
     */
    function addToDailyJackpot(uint256 amount) external onlyOwner {
        currentDailyJackpot += amount;
        emit JackpotUpdated(currentDailyJackpot, getWeeklyJackpot());
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
     * @dev Get player info
     */
    function getPlayerInfo(address player) external view returns (Player memory) {
        return players[player];
    }
    
    /**
     * @dev Internal function to start new daily game
     */
    function _startNewDailyGame() internal {
        _gameId++;
        lastDailyDraw = block.timestamp;
    }
    
    /**
     * @dev Internal function to reset weekly game
     */
    function _resetWeeklyGame() internal {
        weeklyToppingsPool = 0;
        lastWeeklyDraw = block.timestamp;
    }
}
