import { ethers } from "hardhat";
import { FreePriceOracle, PizzaParty, FreeRandomness } from "../typechain-types";

/**
 * Deploy Dynamic Pricing System
 * 
 * This script deploys the free price oracle and updates the PizzaParty contract
 * to use dynamic pricing instead of fixed 1 VMF entry fee.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🚀 Deploying Dynamic Pricing System...");
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await deployer.provider!.getBalance(deployer.address)), "ETH");

  // Deploy Free Price Oracle
  console.log("\n📊 Deploying Free Price Oracle...");
  const FreePriceOracle = await ethers.getContractFactory("FreePriceOracle");
  const priceOracle = await FreePriceOracle.deploy();
  await priceOracle.waitForDeployment();
  
  console.log("✅ Free Price Oracle deployed to:", await priceOracle.getAddress());

  // Deploy Free Randomness Contract
  console.log("\n🎲 Deploying Free Randomness Contract...");
  const FreeRandomness = await ethers.getContractFactory("FreeRandomness");
  const randomnessContract = await FreeRandomness.deploy();
  await randomnessContract.waitForDeployment();
  
  console.log("✅ Free Randomness deployed to:", await randomnessContract.getAddress());

  // Deploy Updated PizzaParty Contract
  console.log("\n🍕 Deploying Updated PizzaParty Contract...");
  const PizzaParty = await ethers.getContractFactory("PizzaParty");
  const pizzaParty = await PizzaParty.deploy(
    "0x2213414893259b0C48066Acd1763e7fbA97859E5", // VMF Token
    await randomnessContract.getAddress(),
    await priceOracle.getAddress()
  );
  await pizzaParty.waitForDeployment();
  
  console.log("✅ PizzaParty deployed to:", await pizzaParty.getAddress());

  // Setup Price Oracle with initial sources
  console.log("\n🔧 Setting up Price Oracle...");
  
  // Add community price sources (example addresses)
  const communitySources = [
    "0x1234567890123456789012345678901234567890", // Community source 1
    "0x2345678901234567890123456789012345678901", // Community source 2
    "0x3456789012345678901234567890123456789012"  // Community source 3
  ];
  
  for (let i = 0; i < communitySources.length; i++) {
    await priceOracle.addPriceSource(communitySources[i], 100); // Equal weight
    console.log(`✅ Added price source ${i + 1}: ${communitySources[i]}`);
  }

  // Set initial emergency price (1 VMF = $1)
  await priceOracle.setEmergencyPrice(ethers.parseEther("1"));
  console.log("✅ Set emergency price: 1 VMF = $1");

  // Verify contracts
  console.log("\n🔍 Verifying contracts...");
  
  try {
    await hre.run("verify:verify", {
      address: await priceOracle.getAddress(),
      constructorArguments: [],
    });
    console.log("✅ Free Price Oracle verified");
  } catch (error) {
    console.log("⚠️ Free Price Oracle verification failed:", error);
  }

  try {
    await hre.run("verify:verify", {
      address: await randomnessContract.getAddress(),
      constructorArguments: [],
    });
    console.log("✅ Free Randomness verified");
  } catch (error) {
    console.log("⚠️ Free Randomness verification failed:", error);
  }

  try {
    await hre.run("verify:verify", {
      address: await pizzaParty.getAddress(),
      constructorArguments: [
        "0x2213414893259b0C48066Acd1763e7fbA97859E5",
        await randomnessContract.getAddress(),
        await priceOracle.getAddress()
      ],
    });
    console.log("✅ PizzaParty verified");
  } catch (error) {
    console.log("⚠️ PizzaParty verification failed:", error);
  }

  // Test dynamic pricing
  console.log("\n🧪 Testing Dynamic Pricing...");
  
  const currentPrice = await priceOracle.getVMFPrice();
  const entryFee = await pizzaParty.getCurrentEntryFee();
  
  console.log("📊 Current VMF Price:", ethers.formatEther(currentPrice), "USD");
  console.log("💰 Entry Fee:", ethers.formatEther(entryFee), "VMF");
  console.log("💵 Entry Fee Value:", ethers.formatEther(entryFee.mul(currentPrice).div(ethers.parseEther("1"))), "USD");

  console.log("\n🎉 Dynamic Pricing System Deployed Successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("Free Price Oracle:", await priceOracle.getAddress());
  console.log("Free Randomness:", await randomnessContract.getAddress());
  console.log("PizzaParty:", await pizzaParty.getAddress());
  
  console.log("\n🔗 BaseScan Links:");
  console.log("Free Price Oracle: https://basescan.org/address/" + await priceOracle.getAddress());
  console.log("Free Randomness: https://basescan.org/address/" + await randomnessContract.getAddress());
  console.log("PizzaParty: https://basescan.org/address/" + await pizzaParty.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 