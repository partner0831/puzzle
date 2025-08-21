require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Updated PizzaPartyCore Contract");
  console.log("📄 VMF Token Address:", process.env.VMF_TOKEN_ADDRESS);
  console.log("🌐 Network: Base Mainnet");

  const VMF_TOKEN_ADDRESS = process.env.VMF_TOKEN_ADDRESS;

  if (!VMF_TOKEN_ADDRESS) {
    throw new Error("VMF_TOKEN_ADDRESS not found in environment variables");
  }

  try {
    // Deploy PizzaPartyCore contract
    console.log("\n🍕 Deploying PizzaPartyCore contract...");
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

    // Save deployment info
    const deploymentInfo = {
      deploymentTime: new Date().toISOString(),
      network: "Base Mainnet",
      contract: "PizzaPartyCore",
      address: pizzaPartyCoreAddress,
      vmfTokenAddress: VMF_TOKEN_ADDRESS,
      features: [
        "Proper topping system implementation",
        "Weekly jackpot calculation from toppings",
        "Referral system with 2 toppings per referral",
        "VMF holdings rewards (3 toppings per 10 VMF)",
        "Daily play rewards (1 topping per day)",
        "1 VMF per topping for jackpot calculation"
      ]
    };

    const fs = require('fs');
    fs.writeFileSync('pizza-party-core-fixed-deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info saved to pizza-party-core-fixed-deployment.json");

    // Print deployment summary
    console.log("\n🎉 PIZZA PARTY CORE DEPLOYMENT COMPLETE!");
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
    console.log("   ✅ Proper topping system implementation");
    console.log("   ✅ Weekly jackpot calculated from total toppings");
    console.log("   ✅ Referral system (2 toppings per referral)");
    console.log("   ✅ VMF holdings rewards (3 toppings per 10 VMF)");
    console.log("   ✅ Daily play rewards (1 topping per day)");
    console.log("   ✅ 1 VMF per topping for jackpot calculation");
    console.log("");
    console.log("🍕 Ready for Pizza Partying on Base! 🎮");

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
