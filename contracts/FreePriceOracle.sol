// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title FreePriceOracle
 * @dev FREE multi-source price oracle for VMF/USD
 * 
 * Aggregates prices from multiple free sources:
 * - Uniswap V3 pools
 * - SushiSwap pools
 * - Community price feeds
 * - Manual price updates
 */
contract FreePriceOracle is Ownable {
    // Price sources
    struct PriceSource {
        address source;
        uint256 price;
        uint256 timestamp;
        bool isActive;
        uint256 weight; // Weight for weighted average
    }
    
    // Price data
    struct PriceData {
        uint256 aggregatedPrice;
        uint256 lastUpdate;
        uint256 totalSources;
        bool isValid;
    }
    
    // State variables
    mapping(address => PriceSource) public priceSources;
    address[] public activeSources;
    PriceData public currentPrice;
    
    // Constants
    uint256 public constant PRICE_PRECISION = 1e18;
    uint256 public constant UPDATE_THRESHOLD = 5 minutes;
    uint256 public constant MAX_PRICE_DEVIATION = 50; // 50% max deviation
    
    // Events
    event PriceSourceAdded(address source, uint256 weight);
    event PriceSourceUpdated(address source, uint256 price, uint256 timestamp);
    event PriceAggregated(uint256 price, uint256 timestamp, uint256 sources);
    event EmergencyPriceSet(uint256 price, address setter);
    
    constructor() Ownable(msg.sender) {
        // Initialize with default price
        currentPrice = PriceData({
            aggregatedPrice: 1e18, // $1 VMF = 1 VMF token
            lastUpdate: block.timestamp,
            totalSources: 1,
            isValid: true
        });
    }
    
    /**
     * @dev Get current VMF price in USD
     */
    function getVMFPrice() public view returns (uint256) {
        if (currentPrice.isValid && 
            block.timestamp < currentPrice.lastUpdate + UPDATE_THRESHOLD) {
            return currentPrice.aggregatedPrice;
        }
        
        return _calculateAggregatedPrice();
    }
    
    /**
     * @dev Get required VMF tokens for $1 entry fee
     */
    function getRequiredVMFForDollar() public view returns (uint256) {
        uint256 vmfPrice = getVMFPrice();
        
        // Calculate: $1 / VMF_price
        return (PRICE_PRECISION * 1e18) / vmfPrice;
    }
    
    /**
     * @dev Add a new price source
     */
    function addPriceSource(address source, uint256 weight) external onlyOwner {
        require(source != address(0), "Invalid source address");
        require(weight > 0, "Weight must be positive");
        
        priceSources[source] = PriceSource({
            source: source,
            price: 0,
            timestamp: 0,
            isActive: true,
            weight: weight
        });
        
        activeSources.push(source);
        
        emit PriceSourceAdded(source, weight);
    }
    
    /**
     * @dev Update price from a source
     */
    function updatePriceFromSource(address source, uint256 price) external {
        require(priceSources[source].isActive, "Source not active");
        require(price > 0, "Invalid price");
        
        // Check for extreme price deviation
        if (currentPrice.isValid) {
            uint256 deviation = _calculateDeviation(price, currentPrice.aggregatedPrice);
            require(deviation <= MAX_PRICE_DEVIATION, "Price deviation too high");
        }
        
        priceSources[source].price = price;
        priceSources[source].timestamp = block.timestamp;
        
        emit PriceSourceUpdated(source, price, block.timestamp);
        
        // Update aggregated price
        _updateAggregatedPrice();
    }
    
    /**
     * @dev Calculate aggregated price from all sources
     */
    function _calculateAggregatedPrice() internal view returns (uint256) {
        if (activeSources.length == 0) {
            return currentPrice.aggregatedPrice;
        }
        
        uint256 totalWeightedPrice = 0;
        uint256 totalWeight = 0;
        uint256 validSources = 0;
        
        for (uint256 i = 0; i < activeSources.length; i++) {
            address source = activeSources[i];
            PriceSource memory sourceData = priceSources[source];
            
            if (sourceData.isActive && 
                block.timestamp < sourceData.timestamp + UPDATE_THRESHOLD) {
                
                totalWeightedPrice = totalWeightedPrice +
                    sourceData.price * sourceData.weight;
                totalWeight = totalWeight + sourceData.weight;
                validSources++;
            }
        }
        
        if (validSources == 0) {
            return currentPrice.aggregatedPrice;
        }
        
        return totalWeightedPrice / totalWeight;
    }
    
    /**
     * @dev Update aggregated price
     */
    function _updateAggregatedPrice() internal {
        uint256 newPrice = _calculateAggregatedPrice();
        
        currentPrice = PriceData({
            aggregatedPrice: newPrice,
            lastUpdate: block.timestamp,
            totalSources: activeSources.length,
            isValid: true
        });
        
        emit PriceAggregated(newPrice, block.timestamp, activeSources.length);
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
     * @dev Emergency price setter (owner only)
     */
    function setEmergencyPrice(uint256 _price) external onlyOwner {
        currentPrice = PriceData({
            aggregatedPrice: _price,
            lastUpdate: block.timestamp,
            totalSources: activeSources.length,
            isValid: true
        });
        
        emit EmergencyPriceSet(_price, msg.sender);
    }
    
    /**
     * @dev Deactivate a price source
     */
    function deactivateSource(address source) external onlyOwner {
        require(priceSources[source].isActive, "Source already inactive");
        
        priceSources[source].isActive = false;
        
        // Remove from active sources array
        for (uint256 i = 0; i < activeSources.length; i++) {
            if (activeSources[i] == source) {
                activeSources[i] = activeSources[activeSources.length - 1];
                activeSources.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Get all active sources
     */
    function getActiveSources() external view returns (address[] memory) {
        return activeSources;
    }
    
    /**
     * @dev Get source data
     */
    function getSourceData(address source) external view returns (
        uint256 price,
        uint256 timestamp,
        bool isActive,
        uint256 weight
    ) {
        PriceSource memory data = priceSources[source];
        return (data.price, data.timestamp, data.isActive, data.weight);
    }
} 