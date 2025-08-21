require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Deployed PizzaPartyCore Contract Functions");
  console.log("🌐 Network: Base Mainnet");

  try {
    // Contract addresses
    const PIZZA_PARTY_CORE_ADDRESS = "0x705C974B290db3421ED749cd5838b982bB9B6c51";
    
    console.log("\n📋 Contract Address:", PIZZA_PARTY_CORE_ADDRESS);
    console.log("🔗 Explorer: https://basescan.org/address/" + PIZZA_PARTY_CORE_ADDRESS);

    // Get provider
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || "https://mainnet.base.org");
    
    // Test basic contract interaction
    console.log("\n🔍 Testing Contract Connection...");
    
    // Try to get the contract code to see if it exists
    const code = await provider.getCode(PIZZA_PARTY_CORE_ADDRESS);
    if (code === "0x") {
      console.log("❌ No contract found at this address!");
      return;
    }
    console.log("✅ Contract exists at address");

    // Test basic functions that should exist
    console.log("\n🧪 Testing Basic Functions:");
    
    const basicFunctions = [
      'getCurrentGameId',
      'currentDailyJackpot', 
      'currentWeeklyJackpot',
      'DAILY_WINNERS_COUNT',
      'WEEKLY_WINNERS_COUNT'
    ];

    for (const funcName of basicFunctions) {
      try {
        const contract = new ethers.Contract(
          PIZZA_PARTY_CORE_ADDRESS,
          [`function ${funcName}() view returns (uint256)`],
          provider
        );
        
        const result = await contract[funcName]();
        console.log(`✅ ${funcName}(): ${result.toString()}`);
      } catch (error) {
        console.log(`❌ ${funcName}(): ${error.message}`);
      }
    }

    // Test the problematic function
    console.log("\n🧪 Testing Weekly Jackpot Function:");
    
    try {
      const contract = new ethers.Contract(
        PIZZA_PARTY_CORE_ADDRESS,
        ['function getWeeklyJackpot() view returns (uint256)'],
        provider
      );
      
      const result = await contract.getWeeklyJackpot();
      console.log(`✅ getWeeklyJackpot(): ${result.toString()}`);
    } catch (error) {
      console.log(`❌ getWeeklyJackpot(): ${error.message}`);
    }

    // Test alternative weekly jackpot functions
    console.log("\n🧪 Testing Alternative Weekly Jackpot Functions:");
    
    const weeklyFunctions = [
      'getWeeklyToppingsPool',
      'getTotalToppingsClaimed',
      'weeklyToppingsPool',
      'totalToppingsClaimed'
    ];

    for (const funcName of weeklyFunctions) {
      try {
        const contract = new ethers.Contract(
          PIZZA_PARTY_CORE_ADDRESS,
          [`function ${funcName}() view returns (uint256)`],
          provider
        );
        
        const result = await contract[funcName]();
        console.log(`✅ ${funcName}(): ${result.toString()}`);
      } catch (error) {
        console.log(`❌ ${funcName}(): ${error.message}`);
      }
    }

    // Test player functions
    console.log("\n🧪 Testing Player Functions:");
    
    const testAddress = "0x0000000000000000000000000000000000000001";
    const playerFunctions = [
      'getPlayerToppings',
      'getPlayerVMFBalance',
      'getPlayerReferralInfo'
    ];

    for (const funcName of playerFunctions) {
      try {
        let abi;
        if (funcName === 'getPlayerReferralInfo') {
          abi = [`function ${funcName}(address) view returns (uint256, address)`];
        } else {
          abi = [`function ${funcName}(address) view returns (uint256)`];
        }
        
        const contract = new ethers.Contract(
          PIZZA_PARTY_CORE_ADDRESS,
          abi,
          provider
        );
        
        const result = await contract[funcName](testAddress);
        console.log(`✅ ${funcName}(${testAddress}): ${result.toString()}`);
      } catch (error) {
        console.log(`❌ ${funcName}(): ${error.message}`);
      }
    }

    console.log("\n📋 Summary:");
    console.log("=".repeat(50));
    console.log("✅ Functions that work are available on the deployed contract");
    console.log("❌ Functions that fail are not available on the deployed contract");
    console.log("🔧 You may need to redeploy the contract with the missing functions");

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
