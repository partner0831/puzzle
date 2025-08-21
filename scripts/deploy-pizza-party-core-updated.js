require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Updated PizzaPartyCore Contract");
  console.log("🌐 Network: Base Mainnet");

  try {
    // Configuration
    const VMF_TOKEN_ADDRESS = "0x2213414893259b0C48066Acd1763e7fbA97859E5";

    console.log("\n📋 Configuration:");
    console.log("VMF Token Address:", VMF_TOKEN_ADDRESS);

    // Deploy PizzaPartyCore contract
    console.log("\n⛽ Deploying PizzaPartyCore contract...");
    const PizzaPartyCore = await ethers.getContractFactory("PizzaPartyCore");
    const pizzaPartyCore = await PizzaPartyCore.deploy(VMF_TOKEN_ADDRESS);
    await pizzaPartyCore.waitForDeployment();
    const pizzaPartyCoreAddress = await pizzaPartyCore.getAddress();
    console.log("✅ PizzaPartyCore deployed at:", pizzaPartyCoreAddress);

    // Verify contract
    console.log("\n🔍 Verifying contract on Basescan...");
    try {
      await hre.run("verify:verify", {
        address: pizzaPartyCoreAddress,
        constructorArguments: [VMF_TOKEN_ADDRESS],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("⚠️ Contract verification failed:", error.message);
    }

    // Test basic functions
    console.log("\n🧪 Testing deployed contract...");
    try {
      const currentGameId = await pizzaPartyCore.getCurrentGameId();
      const dailyJackpot = await pizzaPartyCore.currentDailyJackpot();
      const weeklyJackpot = await pizzaPartyCore.currentWeeklyJackpot();
      
      console.log("✅ getCurrentGameId():", currentGameId.toString());
      console.log("✅ currentDailyJackpot():", dailyJackpot.toString());
      console.log("✅ currentWeeklyJackpot():", weeklyJackpot.toString());
    } catch (error) {
      console.log("❌ Basic function test failed:", error.message);
    }

    // Test topping system functions
    console.log("\n🧪 Testing topping system functions...");
    try {
      const weeklyToppingsPool = await pizzaPartyCore.getWeeklyToppingsPool();
      const totalToppingsClaimed = await pizzaPartyCore.getTotalToppingsClaimed();
      const weeklyJackpotCalc = await pizzaPartyCore.getWeeklyJackpot();
      
      console.log("✅ getWeeklyToppingsPool():", weeklyToppingsPool.toString());
      console.log("✅ getTotalToppingsClaimed():", totalToppingsClaimed.toString());
      console.log("✅ getWeeklyJackpot():", weeklyJackpotCalc.toString());
    } catch (error) {
      console.log("❌ Topping system test failed:", error.message);
    }

    // Save deployment info
    const deploymentInfo = {
      deploymentTime: new Date().toISOString(),
      network: "Base Mainnet",
      contract: "PizzaPartyCore",
      address: pizzaPartyCoreAddress,
      vmfTokenAddress: VMF_TOKEN_ADDRESS,
      features: [
        "Daily game entries with VMF requirement",
        "Weekly jackpot based on toppings system",
        "Referral system with 2 toppings per referral",
        "VMF holdings rewards (3 toppings per 10 VMF)",
        "Daily play rewards (1 topping per day)",
        "8 daily winners, 10 weekly winners",
        "Chainlink VRF integration ready",
        "Blacklist and rate limiting",
        "Emergency controls"
      ],
      constants: {
        dailyWinnersCount: "8",
        weeklyWinnersCount: "10",
        dailyPlayReward: "1 topping",
        referralReward: "2 toppings",
        vmfHoldingReward: "3 toppings per 10 VMF",
        vmfPerTopping: "1 VMF per topping",
        minVmfRequired: "100 VMF",
        maxDailyEntries: "10"
      }
    };

    const fs = require('fs');
    fs.writeFileSync('pizza-party-core-updated-deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info saved to pizza-party-core-updated-deployment.json");

    // Print deployment summary
    console.log("\n🎉 UPDATED PIZZA PARTY CORE DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("📋 DEPLOYMENT SUMMARY:");
    console.log("🌐 Network: Base Mainnet");
    console.log("📅 Time:", new Date().toISOString());
    console.log("");
    console.log("✅ Successfully Deployed:");
    console.log("   🍕 PizzaPartyCore:", pizzaPartyCoreAddress);
    console.log("");
    console.log("🔗 Explorer Links:");
    console.log("   🍕 PizzaPartyCore: https://basescan.org/address/" + pizzaPartyCoreAddress);
    console.log("");
    console.log("🎯 NEW FEATURES:");
    console.log("   ✅ Weekly jackpot based on toppings system");
    console.log("   ✅ Referral system with rewards");
    console.log("   ✅ VMF holdings rewards");
    console.log("   ✅ Daily play rewards");
    console.log("   ✅ getWeeklyJackpot() function");
    console.log("   ✅ getWeeklyToppingsPool() function");
    console.log("   ✅ getTotalToppingsClaimed() function");
    console.log("   ✅ getPlayerReferralInfo() function");
    console.log("");
    console.log("⚠️  NEXT STEPS:");
    console.log("   1. Update frontend contract address to:", pizzaPartyCoreAddress);
    console.log("   2. Test all new functions");
    console.log("   3. Update scheduled winner selection script");
    console.log("   4. Test referral system");
    console.log("");
    console.log("🍕 Ready for topping-based Pizza Partying! 🎮");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
