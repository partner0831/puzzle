require('dotenv').config();
const { ethers } = require("ethers");

async function main() {
  console.log("🍕 Deploying NEW Pizza Party Contract with VRF Integration...");
  
  // Connect to Base network
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  console.log("👤 Deploying with account:", signer.address);
  console.log("🌐 Network: Base");
  
  // VRF Contract Address (already deployed)
  const VRF_CONTRACT_ADDRESS = "0xCCa74Fb01e4aec664b8F57Db1Ce6b702AF8f5a59";
  console.log("🎲 VRF Contract Address:", VRF_CONTRACT_ADDRESS);
  
  // VMF Token Address
  const VMF_TOKEN_ADDRESS = "0x2213414893259b0C48066Acd1763e7fbA97859E5";
  console.log("🪙 VMF Token Address:", VMF_TOKEN_ADDRESS);
  
  try {
    // Pizza Party Contract ABI (simplified for deployment)
    const pizzaPartyABI = [
      "constructor(address _vmfToken, address _vrfContract)",
      "function setVRFContract(address _vrfContract) external",
      "function setUseVRF(bool _useVRF) external",
      "function requestDailyVRF() external",
      "function requestWeeklyVRF() external"
    ];
    
    // Pizza Party Contract Bytecode (you'll need to compile this)
    const pizzaPartyBytecode = "0x608060405234801561001057600080fd5b50604051610..."; // Add your compiled bytecode here
    
    console.log("📦 Deploying Pizza Party contract...");
    
    // Deploy the contract
    const PizzaPartyFactory = new ethers.ContractFactory(pizzaPartyABI, pizzaPartyBytecode, signer);
    const pizzaParty = await PizzaPartyFactory.deploy(VMF_TOKEN_ADDRESS, VRF_CONTRACT_ADDRESS);
    
    console.log("⏳ Waiting for deployment confirmation...");
    await pizzaParty.waitForDeployment();
    
    const pizzaPartyAddress = await pizzaParty.getAddress();
    console.log("✅ Pizza Party deployed at:", pizzaPartyAddress);
    
    // Verify the deployment
    const code = await provider.getCode(pizzaPartyAddress);
    if (code === "0x") {
      throw new Error("Contract deployment failed - no bytecode found");
    }
    
    console.log("✅ Contract verification successful");
    console.log("🎉 New Pizza Party Contract with VRF Integration deployed!");
    console.log("📋 Contract Address:", pizzaPartyAddress);
    console.log("🔗 View on Basescan: https://basescan.org/address/" + pizzaPartyAddress);
    
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
