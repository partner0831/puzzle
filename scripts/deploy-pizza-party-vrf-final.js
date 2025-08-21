require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🍕 Deploying Pizza Party Contract with VRF Integration...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying with account:", deployer.address);
  
  // Check account balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
  
  if (balance < ethers.parseEther("0.01")) {
    throw new Error("Insufficient balance for deployment");
  }
  
  // VRF Contract Address (already deployed)
  const VRF_CONTRACT_ADDRESS = "0xCCa74Fb01e4aec664b8F57Db1Ce6b702AF8f5a59";
  console.log("🎲 VRF Contract Address:", VRF_CONTRACT_ADDRESS);
  
  // VMF Token Address
  const VMF_TOKEN_ADDRESS = "0x2213414893259b0C48066Acd1763e7fbA97859E5";
  console.log("🪙 VMF Token Address:", VMF_TOKEN_ADDRESS);
  
  try {
    console.log("📦 Deploying Pizza Party contract with VRF integration...");
    
    // Deploy the Pizza Party contract
    const PizzaParty = await ethers.getContractFactory("PizzaParty");
    const pizzaParty = await PizzaParty.deploy(VMF_TOKEN_ADDRESS, VRF_CONTRACT_ADDRESS);
    
    console.log("⏳ Waiting for deployment confirmation...");
    await pizzaParty.waitForDeployment();
    
    const pizzaPartyAddress = await pizzaParty.getAddress();
    console.log("✅ Pizza Party deployed at:", pizzaPartyAddress);
    
    // Verify the deployment
    const code = await deployer.provider.getCode(pizzaPartyAddress);
    if (code === "0x") {
      throw new Error("Contract deployment failed - no bytecode found");
    }
    
    console.log("✅ Contract verification successful");
    console.log("🎉 New Pizza Party Contract with VRF Integration deployed!");
    console.log("📋 Contract Address:", pizzaPartyAddress);
    console.log("🔗 View on Basescan: https://basescan.org/address/" + pizzaPartyAddress);
    
    // Test the contract
    console.log("\n🧪 Testing contract integration...");
    
    // Check VRF contract connection
    const vrfContract = await pizzaParty.vrfContract();
    console.log("✅ VRF Contract connected:", vrfContract);
    
    // Check VRF usage setting
    const useVRF = await pizzaParty.useVRF();
    console.log("✅ VRF Usage enabled:", useVRF);
    
    console.log("\n🎯 Deployment Summary:");
    console.log("🍕 Pizza Party Contract:", pizzaPartyAddress);
    console.log("🎲 VRF Contract:", VRF_CONTRACT_ADDRESS);
    console.log("🪙 VMF Token:", VMF_TOKEN_ADDRESS);
    console.log("✅ VRF Integration: Active");
    
    console.log("\n🚀 Next Steps:");
    console.log("1. Update your frontend to use the new contract address");
    console.log("2. The scheduled system will automatically use the new contract");
    console.log("3. Test the VRF integration with a small transaction");
    
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
