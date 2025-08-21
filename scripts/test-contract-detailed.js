require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Detailed Contract Analysis");
  console.log("🌐 Network: Base Mainnet");

  try {
    const PIZZA_PARTY_CORE_ADDRESS = "0x705C974B290db3421ED749cd5838b982bB9B6c51";
    
    console.log("\n📋 Contract Address:", PIZZA_PARTY_CORE_ADDRESS);
    console.log("🔗 Explorer: https://basescan.org/address/" + PIZZA_PARTY_CORE_ADDRESS);

    // Get provider
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || "https://mainnet.base.org");
    
    // Get contract bytecode
    console.log("\n🔍 Checking Contract Bytecode...");
    const code = await provider.getCode(PIZZA_PARTY_CORE_ADDRESS);
    console.log("Contract bytecode length:", code.length);
    console.log("Contract exists:", code !== "0x");

    // Test with the actual contract factory
    console.log("\n🧪 Testing with Contract Factory...");
    
    try {
      const PizzaPartyCore = await ethers.getContractFactory("PizzaPartyCore");
      const contract = PizzaPartyCore.attach(PIZZA_PARTY_CORE_ADDRESS);
      
      console.log("✅ Contract factory attached successfully");
      
      // Test basic functions
      const currentGameId = await contract.getCurrentGameId();
      console.log("✅ getCurrentGameId():", currentGameId.toString());
      
      const dailyJackpot = await contract.currentDailyJackpot();
      console.log("✅ currentDailyJackpot():", dailyJackpot.toString());
      
      // Test topping functions
      const weeklyToppingsPool = await contract.getWeeklyToppingsPool();
      console.log("✅ getWeeklyToppingsPool():", weeklyToppingsPool.toString());
      
      const totalToppingsClaimed = await contract.getTotalToppingsClaimed();
      console.log("✅ getTotalToppingsClaimed():", totalToppingsClaimed.toString());
      
      const weeklyJackpot = await contract.getWeeklyJackpot();
      console.log("✅ getWeeklyJackpot():", weeklyJackpot.toString());
      
    } catch (error) {
      console.log("❌ Contract factory test failed:", error.message);
    }

    // Test with manual ABI
    console.log("\n🧪 Testing with Manual ABI...");
    
    const manualABI = [
      "function getCurrentGameId() view returns (uint256)",
      "function currentDailyJackpot() view returns (uint256)",
      "function getWeeklyToppingsPool() view returns (uint256)",
      "function getTotalToppingsClaimed() view returns (uint256)",
      "function getWeeklyJackpot() view returns (uint256)",
      "function getPlayerToppings(address) view returns (uint256)",
      "function getPlayerReferralInfo(address) view returns (uint256, address)"
    ];
    
    try {
      const contract = new ethers.Contract(PIZZA_PARTY_CORE_ADDRESS, manualABI, provider);
      
      const currentGameId = await contract.getCurrentGameId();
      console.log("✅ getCurrentGameId():", currentGameId.toString());
      
      const dailyJackpot = await contract.currentDailyJackpot();
      console.log("✅ currentDailyJackpot():", dailyJackpot.toString());
      
      const weeklyToppingsPool = await contract.getWeeklyToppingsPool();
      console.log("✅ getWeeklyToppingsPool():", weeklyToppingsPool.toString());
      
      const totalToppingsClaimed = await contract.getTotalToppingsClaimed();
      console.log("✅ getTotalToppingsClaimed():", totalToppingsClaimed.toString());
      
      const weeklyJackpot = await contract.getWeeklyJackpot();
      console.log("✅ getWeeklyJackpot():", weeklyJackpot.toString());
      
    } catch (error) {
      console.log("❌ Manual ABI test failed:", error.message);
    }

    // Check if the issue is with the function signatures
    console.log("\n🔍 Checking Function Signatures...");
    
    const functionSignatures = [
      "getCurrentGameId()",
      "currentDailyJackpot()", 
      "getWeeklyToppingsPool()",
      "getTotalToppingsClaimed()",
      "getWeeklyJackpot()",
      "getPlayerToppings(address)",
      "getPlayerReferralInfo(address)"
    ];
    
    for (const signature of functionSignatures) {
      const selector = ethers.id(signature).slice(0, 10);
      console.log(`${signature}: ${selector}`);
    }

  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
