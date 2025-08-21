require('dotenv').config();
const { ethers } = require("ethers");

async function main() {
    console.log("🔍 Testing Price Oracle...\n");
    
    // Price oracle interface
    const IPriceOracle = [
        "function getVMFPrice() external view returns (uint256)",
        "function getLastUpdateTime() external view returns (uint256)"
    ];
    
    const ORACLE_ADDRESS = "0xAA43fE819C0103fE820c04259929b3f344AfBfa3";
    
    try {
        // Get provider
        const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
        
        // Create contract instance
        const oracle = new ethers.Contract(ORACLE_ADDRESS, IPriceOracle, provider);
        
        console.log(`📍 Oracle Address: ${ORACLE_ADDRESS}`);
        
        // Test getVMFPrice
        try {
            const price = await oracle.getVMFPrice();
            console.log(`💰 VMF Price: ${price.toString()} wei`);
            console.log(`💵 VMF Price: ${ethers.formatEther(price)} ETH`);
        } catch (error) {
            console.log(`❌ getVMFPrice failed: ${error.message}`);
        }
        
        // Test getLastUpdateTime
        try {
            const lastUpdate = await oracle.getLastUpdateTime();
            console.log(`⏰ Last Update Time: ${lastUpdate.toString()}`);
            const date = new Date(Number(lastUpdate) * 1000);
            console.log(`📅 Last Update Date: ${date.toISOString()}`);
        } catch (error) {
            console.log(`❌ getLastUpdateTime failed: ${error.message}`);
        }
        
    } catch (error) {
        console.error("❌ Error testing oracle:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
