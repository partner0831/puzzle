// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PizzaPartyDynamicPricing
 * @dev Dynamic pricing system for Pizza Party game
 * 
 * FEATURES:
 * - Dynamic entry fees based on VMF price
 * - Price oracle integration
 * - Fee calculation algorithms
 * - Price deviation protection
 * - Fee history tracking
 */
// Price oracle interface
interface IPriceOracle {
    function getVMFPrice() external view returns (uint256);
    function getLastUpdateTime() external view returns (uint256);
}

contract PizzaPartyDynamicPricing is ReentrancyGuard, Ownable, Pausable {
    
    // VMF Token contract
    IERC20 public immutable vmfToken;
    
    // Price oracle contract
    IPriceOracle public priceOracle;
    
    // Pricing structure
    struct PricingConfig {
        uint256 baseEntryFee; // Base entry fee in USD (18 decimals)
        uint256 maxPriceDeviation; // Maximum price deviation percentage
        uint256 priceUpdateThreshold; // Time threshold for price updates
        uint256 minEntryFee; // Minimum entry fee in VMF
        uint256 maxEntryFee; // Maximum entry fee in VMF
        uint256 feeMultiplier; // Fee multiplier for dynamic pricing
    }
    
    // Fee history structure
    struct FeeHistory {
        uint256 timestamp;
        uint256 vmfPrice;
        uint256 calculatedFee;
        uint256 actualFee;
        uint256 blockNumber;
    }
    
    // Pricing configuration
    PricingConfig public pricingConfig;
    
    // Fee history tracking
    mapping(uint256 => FeeHistory) public feeHistory;
    uint256 public feeHistoryCount;
    
    // Price tracking
    uint256 public lastVMFPrice;
    uint256 public lastPriceUpdate;
    uint256 public totalFeesCollected;
    uint256 public totalEntries;
    
    // Events
    event PricingConfigUpdated(
        uint256 baseEntryFee,
        uint256 maxPriceDeviation,
        uint256 priceUpdateThreshold,
        uint256 minEntryFee,
        uint256 maxEntryFee,
        uint256 feeMultiplier
    );
    
    event DynamicFeeCalculated(
        uint256 vmfPrice,
        uint256 calculatedFee,
        uint256 actualFee,
        uint256 timestamp
    );
    
    event PriceOracleUpdated(address indexed oldOracle, address indexed newOracle);
    
    event FeeCollected(
        address indexed user,
        uint256 feeAmount,
        uint256 vmfPrice,
        uint256 timestamp
    );
    
    // Modifiers
    modifier validPriceOracle() {
        require(address(priceOracle) != address(0), "Price oracle not set");
        _;
    }
    
    modifier priceNotStale() {
        require(
            block.timestamp - lastPriceUpdate <= pricingConfig.priceUpdateThreshold,
            "Price is stale"
        );
        _;
    }
    
    constructor(address _vmfToken, address _priceOracle) Ownable(msg.sender) {
        require(_vmfToken != address(0), "Invalid VMF token address");
        require(_priceOracle != address(0), "Invalid price oracle address");
        
        vmfToken = IERC20(_vmfToken);
        priceOracle = IPriceOracle(_priceOracle);
        
        // Initialize pricing configuration
        pricingConfig = PricingConfig({
            baseEntryFee: 1 * 10**18, // $1 USD
            maxPriceDeviation: 50, // 50%
            priceUpdateThreshold: 5 minutes,
            minEntryFee: 1 * 10**18, // 1 VMF minimum
            maxEntryFee: 1000 * 10**18, // 1000 VMF maximum
            feeMultiplier: 100 // 100% (1.0x)
        });
        
        // Initialize price tracking
        lastVMFPrice = priceOracle.getVMFPrice();
        lastPriceUpdate = block.timestamp;
    }
    
    /**
     * @dev Calculate dynamic entry fee
     */
    function calculateDynamicEntryFee() 
        external 
        view 
        validPriceOracle 
        returns (uint256 feeAmount, uint256 vmfPrice)
    {
        vmfPrice = priceOracle.getVMFPrice();
        feeAmount = _calculateFeeFromPrice(vmfPrice);
        
        // Apply bounds
        if (feeAmount < pricingConfig.minEntryFee) {
            feeAmount = pricingConfig.minEntryFee;
        } else if (feeAmount > pricingConfig.maxEntryFee) {
            feeAmount = pricingConfig.maxEntryFee;
        }
        
        return (feeAmount, vmfPrice);
    }
    
    /**
     * @dev Get current entry fee
     */
    function getCurrentEntryFee() external view returns (uint256) {
        (uint256 feeAmount,) = this.calculateDynamicEntryFee();
        return feeAmount;
    }
    
    /**
     * @dev Get VMF price from oracle
     */
    function getVMFPrice() external view validPriceOracle returns (uint256) {
        return priceOracle.getVMFPrice();
    }
    
    /**
     * @dev Update pricing configuration
     */
    function updatePricingConfig(
        uint256 _baseEntryFee,
        uint256 _maxPriceDeviation,
        uint256 _priceUpdateThreshold,
        uint256 _minEntryFee,
        uint256 _maxEntryFee,
        uint256 _feeMultiplier
    ) external onlyOwner {
        require(_baseEntryFee > 0, "Base entry fee must be positive");
        require(_maxPriceDeviation <= 100, "Max deviation cannot exceed 100%");
        require(_minEntryFee <= _maxEntryFee, "Min fee cannot exceed max fee");
        require(_feeMultiplier > 0, "Fee multiplier must be positive");
        
        pricingConfig = PricingConfig({
            baseEntryFee: _baseEntryFee,
            maxPriceDeviation: _maxPriceDeviation,
            priceUpdateThreshold: _priceUpdateThreshold,
            minEntryFee: _minEntryFee,
            maxEntryFee: _maxEntryFee,
            feeMultiplier: _feeMultiplier
        });
        
        emit PricingConfigUpdated(
            _baseEntryFee,
            _maxPriceDeviation,
            _priceUpdateThreshold,
            _minEntryFee,
            _maxEntryFee,
            _feeMultiplier
        );
    }
    
    /**
     * @dev Update price oracle
     */
    function updatePriceOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Invalid oracle address");
        
        address oldOracle = address(priceOracle);
        priceOracle = IPriceOracle(_newOracle);
        
        // Update price tracking
        lastVMFPrice = priceOracle.getVMFPrice();
        lastPriceUpdate = block.timestamp;
        
        emit PriceOracleUpdated(oldOracle, _newOracle);
    }
    
    /**
     * @dev Collect entry fee
     */
    function collectEntryFee(address user) 
        external 
        nonReentrant 
        whenNotPaused 
        validPriceOracle 
        priceNotStale 
        returns (uint256 feeAmount)
    {
        // Calculate dynamic fee
        uint256 vmfPrice;
        (feeAmount, vmfPrice) = this.calculateDynamicEntryFee();
        
        // Check price deviation
        require(
            _isPriceWithinDeviation(vmfPrice),
            "Price deviation too high"
        );
        
        // Transfer fee from user
        require(
            vmfToken.transferFrom(user, address(this), feeAmount),
            "Fee transfer failed"
        );
        
        // Update tracking
        totalFeesCollected += feeAmount;
        totalEntries++;
        
        // Update price tracking
        lastVMFPrice = vmfPrice;
        lastPriceUpdate = block.timestamp;
        
        // Record fee history
        _recordFeeHistory(vmfPrice, feeAmount, feeAmount);
        
        emit FeeCollected(user, feeAmount, vmfPrice, block.timestamp);
        
        return feeAmount;
    }
    
    /**
     * @dev Get fee history
     */
    function getFeeHistory(uint256 startIndex, uint256 count) 
        external 
        view 
        returns (FeeHistory[] memory)
    {
        require(startIndex < feeHistoryCount, "Invalid start index");
        
        uint256 endIndex = startIndex + count;
        if (endIndex > feeHistoryCount) {
            endIndex = feeHistoryCount;
        }
        
        FeeHistory[] memory history = new FeeHistory[](endIndex - startIndex);
        
        for (uint256 i = startIndex; i < endIndex; i++) {
            history[i - startIndex] = feeHistory[i];
        }
        
        return history;
    }
    
    /**
     * @dev Get pricing statistics
     */
    function getPricingStats() external view returns (
        uint256 _totalFeesCollected,
        uint256 _totalEntries,
        uint256 _averageFee,
        uint256 _lastVMFPrice,
        uint256 _lastPriceUpdate
    ) {
        _totalFeesCollected = totalFeesCollected;
        _totalEntries = totalEntries;
        _averageFee = totalEntries > 0 ? totalFeesCollected / totalEntries : 0;
        _lastVMFPrice = lastVMFPrice;
        _lastPriceUpdate = lastPriceUpdate;
        
        return (_totalFeesCollected, _totalEntries, _averageFee, _lastVMFPrice, _lastPriceUpdate);
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
     * @dev Withdraw collected fees
     */
    function withdrawFees(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        
        uint256 balance = vmfToken.balanceOf(address(this));
        require(balance > 0, "No fees to withdraw");
        
        require(vmfToken.transfer(recipient, balance), "Fee withdrawal failed");
    }
    
    /**
     * @dev Internal function to calculate fee from price
     */
    function _calculateFeeFromPrice(uint256 vmfPrice) internal view returns (uint256) {
        if (vmfPrice == 0) {
            return pricingConfig.minEntryFee;
        }
        
        // Calculate fee: (baseEntryFee * feeMultiplier) / vmfPrice
        uint256 calculatedFee = (pricingConfig.baseEntryFee * pricingConfig.feeMultiplier) / vmfPrice;
        
        return calculatedFee;
    }
    
    /**
     * @dev Internal function to check price deviation
     */
    function _isPriceWithinDeviation(uint256 currentPrice) internal view returns (bool) {
        if (lastVMFPrice == 0) {
            return true;
        }
        
        uint256 deviation = currentPrice > lastVMFPrice ? 
            ((currentPrice - lastVMFPrice) * 100) / lastVMFPrice :
            ((lastVMFPrice - currentPrice) * 100) / lastVMFPrice;
        
        return deviation <= pricingConfig.maxPriceDeviation;
    }
    
    /**
     * @dev Internal function to record fee history
     */
    function _recordFeeHistory(uint256 vmfPrice, uint256 calculatedFee, uint256 actualFee) internal {
        FeeHistory memory history = FeeHistory({
            timestamp: block.timestamp,
            vmfPrice: vmfPrice,
            calculatedFee: calculatedFee,
            actualFee: actualFee,
            blockNumber: block.number
        });
        
        feeHistory[feeHistoryCount] = history;
        feeHistoryCount++;
        
        emit DynamicFeeCalculated(vmfPrice, calculatedFee, actualFee, block.timestamp);
    }
}
