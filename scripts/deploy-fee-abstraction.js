require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying PizzaPartyFeeAbstraction Contract");
  console.log("🌐 Network: Base Mainnet");

  // Configuration
  const PAYMASTER_ADDRESS = "0x0000000000000000000000000000000000000000"; // TODO: Replace with actual Base paymaster
  const DAILY_GAS_LIMIT = ethers.parseEther("0.1"); // 0.1 ETH daily gas limit

  try {
    // Deploy PizzaPartyFeeAbstraction contract
    console.log("\n⛽ Deploying PizzaPartyFeeAbstraction contract...");
    const PizzaPartyFeeAbstraction = await ethers.getContractFactory("PizzaPartyFeeAbstraction");
    const feeAbstraction = await PizzaPartyFeeAbstraction.deploy(PAYMASTER_ADDRESS, DAILY_GAS_LIMIT);
    await feeAbstraction.waitForDeployment();
    const feeAbstractionAddress = await feeAbstraction.getAddress();
    console.log("✅ PizzaPartyFeeAbstraction deployed at:", feeAbstractionAddress);

    // Verify contract
    console.log("\n🔍 Verifying contract on Basescan...");
    try {
      await hre.run("verify:verify", {
        address: feeAbstractionAddress,
        constructorArguments: [PAYMASTER_ADDRESS, DAILY_GAS_LIMIT],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("⚠️ Contract verification failed:", error.message);
    }

    // Save deployment info
    const deploymentInfo = {
      deploymentTime: new Date().toISOString(),
      network: "Base Mainnet",
      contract: "PizzaPartyFeeAbstraction",
      address: feeAbstractionAddress,
      paymasterAddress: PAYMASTER_ADDRESS,
      dailyGasLimit: DAILY_GAS_LIMIT.toString(),
      features: [
        "Gas sponsorship for game entries",
        "Daily limits (3 free entries per user per day)",
        "Paymaster integration with Base fee abstraction",
        "Emergency controls and monitoring",
        "Real-time gas usage tracking"
      ],
      configuration: {
        gasLimitPerEntry: "150000",
        maxDailyEntries: "1000",
        userDailyGasLimit: "450000" // 3 entries × 150000 gas
      }
    };

    const fs = require('fs');
    fs.writeFileSync('fee-abstraction-deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info saved to fee-abstraction-deployment.json");

    // Print deployment summary
    console.log("\n🎉 FEE ABSTRACTION DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("📋 DEPLOYMENT SUMMARY:");
    console.log("🌐 Network: Base Mainnet");
    console.log("📅 Time:", new Date().toISOString());
    console.log("");
    console.log("✅ Successfully Deployed:");
    console.log("   ⛽ PizzaPartyFeeAbstraction:", feeAbstractionAddress);
    console.log("");
    console.log("🔗 Explorer Links:");
    console.log("   ⛽ PizzaPartyFeeAbstraction: https://basescan.org/address/" + feeAbstractionAddress);
    console.log("");
    console.log("🎯 FEATURES:");
    console.log("   ✅ Gas sponsorship for game entries");
    console.log("   ✅ Daily limits (3 free entries per user per day)");
    console.log("   ✅ Paymaster integration with Base fee abstraction");
    console.log("   ✅ Emergency controls and monitoring");
    console.log("   ✅ Real-time gas usage tracking");
    console.log("");
    console.log("⚠️  NEXT STEPS:");
    console.log("   1. Update PAYMASTER_ADDRESS with actual Base paymaster");
    console.log("   2. Fund the contract with ETH for gas sponsorship");
    console.log("   3. Update contract configuration in frontend");
    console.log("   4. Test gasless transactions");
    console.log("");
    console.log("🍕 Ready for gasless Pizza Partying on Base! 🎮");

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
