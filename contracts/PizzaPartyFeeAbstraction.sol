// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PizzaPartyFeeAbstraction
 * @dev Enables gasless transactions for Pizza Party game using Base fee abstraction
 */
contract PizzaPartyFeeAbstraction is Ownable, ReentrancyGuard {
    
    // Events
    event GasSponsored(address indexed user, uint256 gasCost, bytes32 indexed txHash);
    event PaymasterUpdated(address indexed oldPaymaster, address indexed newPaymaster);
    event DailyGasLimitUpdated(uint256 oldLimit, uint256 newLimit);
    event UserGasLimitUpdated(address indexed user, uint256 oldLimit, uint256 newLimit);
    
    // State variables
    address public paymaster;
    uint256 public dailyGasLimit;
    uint256 public userDailyGasLimit;
    
    // Tracking
    mapping(address => uint256) public userDailyGasUsed;
    mapping(uint256 => uint256) public dailyGasUsed; // date => gas used
    
    // Constants
    uint256 public constant GAS_LIMIT_PER_ENTRY = 150000; // Estimated gas for game entry
    uint256 public constant MAX_DAILY_ENTRIES = 1000; // Max sponsored entries per day
    
    constructor(address _paymaster, uint256 _dailyGasLimit) Ownable(msg.sender) {
        paymaster = _paymaster;
        dailyGasLimit = _dailyGasLimit;
        userDailyGasLimit = 3 * GAS_LIMIT_PER_ENTRY; // 3 free entries per day per user
    }
    
    /**
     * @dev Sponsor gas for game entry
     * @param user Address of the user entering the game
     * @param gameContract Address of the Pizza Party game contract
     * @param referrer Optional referrer address
     */
    function sponsorGameEntry(
        address user,
        address gameContract,
        address referrer
    ) external onlyOwner nonReentrant {
        require(user != address(0), "Invalid user address");
        require(gameContract != address(0), "Invalid game contract");
        
        // Check daily limits
        uint256 today = block.timestamp / 1 days;
        require(dailyGasUsed[today] + GAS_LIMIT_PER_ENTRY <= dailyGasLimit, "Daily gas limit exceeded");
        require(userDailyGasUsed[user] + GAS_LIMIT_PER_ENTRY <= userDailyGasLimit, "User daily limit exceeded");
        
        // Update gas usage
        dailyGasUsed[today] += GAS_LIMIT_PER_ENTRY;
        userDailyGasUsed[user] += GAS_LIMIT_PER_ENTRY;
        
        // Call paymaster to sponsor transaction
        bytes memory callData = abi.encodeWithSignature(
            "enterDailyGame(address)",
            referrer
        );
        
        // Emit event
        emit GasSponsored(user, GAS_LIMIT_PER_ENTRY, keccak256(abi.encodePacked(user, gameContract, referrer)));
    }
    
    /**
     * @dev Reset user's daily gas usage (called daily)
     */
    function resetUserDailyGasUsage(address user) external onlyOwner {
        userDailyGasUsed[user] = 0;
    }
    
    /**
     * @dev Update paymaster address
     */
    function updatePaymaster(address newPaymaster) external onlyOwner {
        require(newPaymaster != address(0), "Invalid paymaster address");
        address oldPaymaster = paymaster;
        paymaster = newPaymaster;
        emit PaymasterUpdated(oldPaymaster, newPaymaster);
    }
    
    /**
     * @dev Update daily gas limit
     */
    function updateDailyGasLimit(uint256 newLimit) external onlyOwner {
        require(newLimit > 0, "Invalid gas limit");
        uint256 oldLimit = dailyGasLimit;
        dailyGasLimit = newLimit;
        emit DailyGasLimitUpdated(oldLimit, newLimit);
    }
    
    /**
     * @dev Update user daily gas limit
     */
    function updateUserDailyGasLimit(uint256 newLimit) external onlyOwner {
        require(newLimit > 0, "Invalid gas limit");
        uint256 oldLimit = userDailyGasLimit;
        userDailyGasLimit = newLimit;
        emit UserGasLimitUpdated(address(0), oldLimit, newLimit);
    }
    
    /**
     * @dev Get user's remaining daily gas allowance
     */
    function getUserRemainingGasAllowance(address user) external view returns (uint256) {
        uint256 used = userDailyGasUsed[user];
        return used >= userDailyGasLimit ? 0 : userDailyGasLimit - used;
    }
    
    /**
     * @dev Get daily gas usage for a specific date
     */
    function getDailyGasUsage(uint256 date) external view returns (uint256) {
        return dailyGasUsed[date];
    }
    
    /**
     * @dev Emergency pause (placeholder for future implementation)
     */
    function emergencyPause() external onlyOwner {
        // TODO: Implement pause functionality
    }
    
    /**
     * @dev Emergency unpause (placeholder for future implementation)
     */
    function emergencyUnpause() external onlyOwner {
        // TODO: Implement unpause functionality
    }
    
    /**
     * @dev Withdraw any ETH sent to this contract
     */
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "ETH withdrawal failed");
    }
}
