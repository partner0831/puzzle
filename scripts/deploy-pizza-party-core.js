require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying PizzaPartyCore Contract...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying from address:", deployer.address);
  
  // Check deployer balance
  const balance = await deployer.getBalance();
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "ETH");
  
  if (balance.lt(ethers.parseEther("0.01"))) {
    throw new Error("Insufficient balance for deployment");
  }
  
  // VMF Token address on Base mainnet
  const VMF_TOKEN_ADDRESS = "0x2213414893259b0C48066Acd1763e7fbA97859E5";
  
  console.log("🎯 VMF Token Address:", VMF_TOKEN_ADDRESS);
  
  try {
    // Deploy PizzaPartyCore contract
    console.log("📦 Deploying PizzaPartyCore...");
    const PizzaPartyCore = await ethers.getContractFactory("PizzaPartyCore");
    const pizzaPartyCore = await PizzaPartyCore.deploy(VMF_TOKEN_ADDRESS);
    
    console.log("⏳ Waiting for deployment confirmation...");
    await pizzaPartyCore.waitForDeployment();
    
    const pizzaPartyCoreAddress = await pizzaPartyCore.getAddress();
    console.log("✅ PizzaPartyCore deployed to:", pizzaPartyCoreAddress);
    
    // Verify deployment
    console.log("🔍 Verifying deployment...");
    const deployedCode = await ethers.provider.getCode(pizzaPartyCoreAddress);
    if (deployedCode === "0x") {
      throw new Error("Contract deployment failed - no code at address");
    }
    
    console.log("✅ Contract code verified");
    
    // Test basic functionality
    console.log("🧪 Testing basic functionality...");
    
    // Get current game ID
    const currentGameId = await pizzaPartyCore.getCurrentGameId();
    console.log("🎮 Current Game ID:", currentGameId.toString());
    
    // Get daily jackpot
    const dailyJackpot = await pizzaPartyCore.getDailyJackpot();
    console.log("💰 Daily Jackpot:", ethers.formatEther(dailyJackpot), "VMF");
    
    // Get weekly jackpot
    const weeklyJackpot = await pizzaPartyCore.getWeeklyJackpot();
    console.log("💰 Weekly Jackpot:", ethers.formatEther(weeklyJackpot), "VMF");
    
    // Get minimum VMF required
    const minVMFRequired = await pizzaPartyCore.getMinimumVMFRequired();
    console.log("🪙 Minimum VMF Required:", ethers.formatEther(minVMFRequired), "VMF");
    
    // Check if daily draw is ready
    const dailyDrawReady = await pizzaPartyCore.isDailyDrawReady();
    console.log("📅 Daily Draw Ready:", dailyDrawReady);
    
    // Check if weekly draw is ready
    const weeklyDrawReady = await pizzaPartyCore.isWeeklyDrawReady();
    console.log("📅 Weekly Draw Ready:", weeklyDrawReady);
    
    console.log("\n🎉 PizzaPartyCore deployment successful!");
    console.log("📋 Deployment Summary:");
    console.log("   Contract Address:", pizzaPartyCoreAddress);
    console.log("   VMF Token:", VMF_TOKEN_ADDRESS);
    console.log("   Deployer:", deployer.address);
    console.log("   Network:", (await ethers.provider.getNetwork()).name);
    
    // Save deployment info
    const deploymentInfo = {
      contractAddress: pizzaPartyCoreAddress,
      vmfTokenAddress: VMF_TOKEN_ADDRESS,
      deployer: deployer.address,
      network: (await ethers.provider.getNetwork()).name,
      deploymentTime: new Date().toISOString(),
      contractName: "PizzaPartyCore"
    };
    
    const fs = require('fs');
    fs.writeFileSync('pizza-party-core-deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info saved to pizza-party-core-deployment.json");
    
    return pizzaPartyCoreAddress;
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
