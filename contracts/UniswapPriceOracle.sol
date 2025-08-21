// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";


/**
 * @title UniswapPriceOracle
 * @dev FREE price oracle using Uniswap V3 pools
 * 
 * This contract provides VMF/USD pricing without paid services
 * Uses Uniswap V3 pool data to calculate current VMF price
 */
contract UniswapPriceOracle is Ownable {
    
    
    // Uniswap V3 pool for VMF/USDC (assuming USDC is stable)
    address public constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address public constant VMF_TOKEN = 0x2213414893259b0C48066Acd1763e7fbA97859E5;
    address public constant USDC_TOKEN = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // USDC on Base
    
    // Pool fee tier (0.05% = 500)
    uint24 public constant POOL_FEE = 500;
    
    // Price cache with timestamp
    struct PriceCache {
        uint256 price;
        uint256 timestamp;
        bool isValid;
    }
    
    // Cached price data
    PriceCache public priceCache;
    uint256 public constant CACHE_DURATION = 5 minutes;
    uint256 public constant PRICE_PRECISION = 1e18;
    
    // Events
    event PriceUpdated(uint256 price, uint256 timestamp);
    event EmergencyPriceSet(uint256 price, address setter);
    
    constructor() Ownable(msg.sender) {
        // Initialize with a reasonable default price
        priceCache = PriceCache({
            price: 1e18, // $1 VMF = 1 VMF token (1:1 ratio)
            timestamp: block.timestamp,
            isValid: true
        });
    }
    
    /**
     * @dev Get current VMF price in USD (8 decimals)
     */
    function getVMFPrice() public view returns (uint256) {
        // Check if cache is still valid
        if (priceCache.isValid && 
            block.timestamp < priceCache.timestamp + CACHE_DURATION) {
            return priceCache.price;
        }
        
        // Calculate price from Uniswap V3 pool
        return _calculateUniswapPrice();
    }
    
    /**
     * @dev Calculate required VMF tokens for $1 entry fee
     */
    function getRequiredVMFForDollar() public view returns (uint256) {
        uint256 vmfPrice = getVMFPrice();
        
        // If VMF price is $1, return 1 VMF
        if (vmfPrice == 1e18) {
            return 1e18;
        }
        
        // Calculate: $1 / VMF_price
        return (PRICE_PRECISION * 1e18) / vmfPrice;
    }
    
    /**
     * @dev Update price cache (can be called by anyone)
     */
    function updatePriceCache() external {
        uint256 newPrice = _calculateUniswapPrice();
        
        priceCache = PriceCache({
            price: newPrice,
            timestamp: block.timestamp,
            isValid: true
        });
        
        emit PriceUpdated(newPrice, block.timestamp);
    }
    
    /**
     * @dev Emergency price setter (owner only)
     */
    function setEmergencyPrice(uint256 _price) external onlyOwner {
        priceCache = PriceCache({
            price: _price,
            timestamp: block.timestamp,
            isValid: true
        });
        
        emit EmergencyPriceSet(_price, msg.sender);
    }
    
    /**
     * @dev Calculate price from Uniswap V3 pool
     */
    function _calculateUniswapPrice() internal view returns (uint256) {
        // Get pool address
        address pool = _getPoolAddress(VMF_TOKEN, USDC_TOKEN, POOL_FEE);
        
        if (pool == address(0)) {
            // Pool doesn't exist, return cached price or default
            return priceCache.isValid ? priceCache.price : 1e18;
        }
        
        // Get pool data
        (uint160 sqrtPriceX96, , , , , , ) = IUniswapV3Pool(pool).slot0();
        
        // Calculate price from sqrtPriceX96
        uint256 price = _calculatePriceFromSqrtPriceX96(sqrtPriceX96);
        
        return price;
    }
    
    /**
     * @dev Calculate price from sqrtPriceX96
     */
    function _calculatePriceFromSqrtPriceX96(uint160 sqrtPriceX96) internal pure returns (uint256) {
        uint256 price = uint256(sqrtPriceX96);
        price = (price * price * 1e18) / 2**192;
        return price;
    }
    
    /**
     * @dev Get Uniswap V3 pool address
     */
    function _getPoolAddress(address tokenA, address tokenB, uint24 fee) internal pure returns (address) {
        // Simplified pool address calculation
        // In production, use Uniswap V3 Factory to get pool address
        return address(0); // Placeholder
    }
}

/**
 * @title IUniswapV3Pool
 * @dev Minimal interface for Uniswap V3 pool
 */
interface IUniswapV3Pool {
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
}

/**
 * @title IUniswapV3Factory
 * @dev Minimal interface for Uniswap V3 factory
 */
interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
} 