require('dotenv').config();
const { ethers } = require("ethers");

async function main() {
    console.log("🔍 Testing Jackpot Values...\n");
    
    // Contract addresses
    const PIZZA_PARTY_CORE_ADDRESS = "0xCD8a3a397CdE223c47602d2C37a3b8a5B99a6460";
    
    // PizzaPartyCore ABI (just the functions we need)
    const PizzaPartyCoreABI = [
        "function getDailyJackpot() external view returns (uint256)",
        "function getWeeklyJackpot() external view returns (uint256)",
        "function currentDailyJackpot() external view returns (uint256)",
        "function currentWeeklyJackpot() external view returns (uint256)",
        "function getCurrentGameId() external view returns (uint256)"
    ];
    
    try {
        // Get provider
        const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
        
        // Create contract instance
        const pizzaPartyCore = new ethers.Contract(PIZZA_PARTY_CORE_ADDRESS, PizzaPartyCoreABI, provider);
        
        console.log(`📍 PizzaPartyCore Address: ${PIZZA_PARTY_CORE_ADDRESS}`);
        
        // Test getDailyJackpot function
        try {
            const dailyJackpot = await pizzaPartyCore.getDailyJackpot();
            console.log(`💰 getDailyJackpot(): ${dailyJackpot.toString()} wei`);
            console.log(`💰 getDailyJackpot(): ${ethers.formatEther(dailyJackpot)} VMF`);
        } catch (error) {
            console.log(`❌ getDailyJackpot() failed: ${error.message}`);
        }
        
        // Test getWeeklyJackpot function
        try {
            const weeklyJackpot = await pizzaPartyCore.getWeeklyJackpot();
            console.log(`🎯 getWeeklyJackpot(): ${weeklyJackpot.toString()} wei`);
            console.log(`🎯 getWeeklyJackpot(): ${ethers.formatEther(weeklyJackpot)} VMF`);
        } catch (error) {
            console.log(`❌ getWeeklyJackpot() failed: ${error.message}`);
        }
        
        // Test currentDailyJackpot state variable
        try {
            const currentDaily = await pizzaPartyCore.currentDailyJackpot();
            console.log(`💰 currentDailyJackpot: ${currentDaily.toString()} wei`);
            console.log(`💰 currentDailyJackpot: ${ethers.formatEther(currentDaily)} VMF`);
        } catch (error) {
            console.log(`❌ currentDailyJackpot failed: ${error.message}`);
        }
        
        // Test currentWeeklyJackpot state variable
        try {
            const currentWeekly = await pizzaPartyCore.currentWeeklyJackpot();
            console.log(`🎯 currentWeeklyJackpot: ${currentWeekly.toString()} wei`);
            console.log(`🎯 currentWeeklyJackpot: ${ethers.formatEther(currentWeekly)} VMF`);
        } catch (error) {
            console.log(`❌ currentWeeklyJackpot failed: ${error.message}`);
        }
        
        // Test getCurrentGameId
        try {
            const gameId = await pizzaPartyCore.getCurrentGameId();
            console.log(`🎮 Current Game ID: ${gameId.toString()}`);
        } catch (error) {
            console.log(`❌ getCurrentGameId failed: ${error.message}`);
        }
        
    } catch (error) {
        console.error("❌ Error testing jackpot values:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
