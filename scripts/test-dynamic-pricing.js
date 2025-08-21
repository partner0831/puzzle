require('dotenv').config();
const { ethers } = require("ethers");

async function main() {
    console.log("🔍 Testing PizzaPartyDynamicPricing...\n");
    
    // Contract addresses
    const DYNAMIC_PRICING_ADDRESS = "0x0F5a91907039eecebEA78ad2d327C7521d4F7892";
    const VMF_TOKEN_ADDRESS = "0x2213414893259b0C48066Acd1763e7fbA97859E5";
    const ORACLE_ADDRESS = "0xAA43fE819C0103fE820c04259929b3f344AfBfa3";
    
    // Dynamic Pricing ABI (just the functions we need)
    const DynamicPricingABI = [
        "function calculateDynamicEntryFee() external view returns (uint256 feeAmount, uint256 vmfPrice)",
        "function getCurrentEntryFee() external view returns (uint256)",
        "function getVMFPrice() external view returns (uint256)",
        "function priceOracle() external view returns (address)",
        "function pricingConfig() external view returns (uint256 baseEntryFee, uint256 maxPriceDeviation, uint256 priceUpdateThreshold, uint256 minEntryFee, uint256 maxEntryFee, uint256 feeMultiplier)"
    ];
    
    try {
        // Get provider
        const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
        
        // Create contract instance
        const dynamicPricing = new ethers.Contract(DYNAMIC_PRICING_ADDRESS, DynamicPricingABI, provider);
        
        console.log(`📍 Dynamic Pricing Address: ${DYNAMIC_PRICING_ADDRESS}`);
        console.log(`📍 VMF Token Address: ${VMF_TOKEN_ADDRESS}`);
        console.log(`📍 Oracle Address: ${ORACLE_ADDRESS}`);
        
        // Test priceOracle
        try {
            const oracleAddress = await dynamicPricing.priceOracle();
            console.log(`🔗 Contract's Oracle Address: ${oracleAddress}`);
            console.log(`✅ Oracle addresses match: ${oracleAddress === ORACLE_ADDRESS}`);
        } catch (error) {
            console.log(`❌ priceOracle failed: ${error.message}`);
        }
        
        // Test getVMFPrice
        try {
            const price = await dynamicPricing.getVMFPrice();
            console.log(`💰 VMF Price from contract: ${price.toString()} wei`);
            console.log(`💵 VMF Price from contract: ${ethers.formatEther(price)} ETH`);
        } catch (error) {
            console.log(`❌ getVMFPrice failed: ${error.message}`);
        }
        
        // Test getCurrentEntryFee
        try {
            const entryFee = await dynamicPricing.getCurrentEntryFee();
            console.log(`🎯 Current Entry Fee: ${entryFee.toString()} wei`);
            console.log(`🎯 Current Entry Fee: ${ethers.formatEther(entryFee)} VMF`);
        } catch (error) {
            console.log(`❌ getCurrentEntryFee failed: ${error.message}`);
        }
        
        // Test calculateDynamicEntryFee
        try {
            const [feeAmount, vmfPrice] = await dynamicPricing.calculateDynamicEntryFee();
            console.log(`🎯 Calculated Entry Fee: ${feeAmount.toString()} wei`);
            console.log(`🎯 Calculated Entry Fee: ${ethers.formatEther(feeAmount)} VMF`);
            console.log(`💰 VMF Price used: ${vmfPrice.toString()} wei`);
            console.log(`💰 VMF Price used: ${ethers.formatEther(vmfPrice)} ETH`);
        } catch (error) {
            console.log(`❌ calculateDynamicEntryFee failed: ${error.message}`);
        }
        
        // Test pricingConfig
        try {
            const config = await dynamicPricing.pricingConfig();
            console.log(`⚙️ Pricing Config:`);
            console.log(`  - Base Entry Fee: ${ethers.formatEther(config[0])} USD`);
            console.log(`  - Max Price Deviation: ${config[1]}%`);
            console.log(`  - Price Update Threshold: ${config[2]} seconds`);
            console.log(`  - Min Entry Fee: ${ethers.formatEther(config[3])} VMF`);
            console.log(`  - Max Entry Fee: ${ethers.formatEther(config[4])} VMF`);
            console.log(`  - Fee Multiplier: ${config[5]}%`);
        } catch (error) {
            console.log(`❌ pricingConfig failed: ${error.message}`);
        }
        
    } catch (error) {
        console.error("❌ Error testing dynamic pricing:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
