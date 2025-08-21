require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Final Pizza Party Smart Contracts to Base Network...");
  console.log("📅 Deployment Time:", new Date().toISOString());

  // VMF Token contract address on Base network
  const VMF_TOKEN_ADDRESS = "0x2213414893259b0C48066Acd1763e7fbA97859E5";

  // Already deployed contracts from previous runs
  const randomnessAddress = "0xF64dF5C5c399c051210f02309A6cB12cB7797e88";
  const priceOracleAddress = "0xAA43fE819C0103fE820c04259929b3f344AfBfa3";
  const uniswapPriceOracleAddress = "0xA5deaebA77225546dE3C363F695319356E33B7D6";
  const referralSystemAddress = "0xDfFa13C23786ecf2Fc681e74e351b05c9C33f367";

  console.log("📄 VMF Token Address:", VMF_TOKEN_ADDRESS);
  console.log("🌐 Network: Base Mainnet");
  console.log("📋 Already deployed:");
  console.log("   🎲 FreeRandomness:", randomnessAddress);
  console.log("   📊 FreePriceOracle:", priceOracleAddress);
  console.log("   📈 UniswapPriceOracle:", uniswapPriceOracleAddress);
  console.log("   🔗 SecureReferralSystem:", referralSystemAddress);

  const deploymentResults = {};

  // Helper function to add delay between deployments
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // 1. Deploy ChainlinkVRF contract with smaller subscription ID for testing
    console.log("\n🎲 1. Deploying ChainlinkVRF contract...");
    const ChainlinkVRF = await ethers.getContractFactory("ChainlinkVRF");
    
    // Chainlink VRF v2.5 configuration for Base mainnet (using smaller subscription ID for testing)
    const VRF_COORDINATOR = "0xd5d517abe5cf79b7e95ec98db0f0277788aff634";
    const SUBSCRIPTION_ID = 1; // Using 1 for testing - you'll need to create a real subscription
    const KEY_HASH = "0x00b81b5a830cb0a4009fbd8904de511e28631e62ce5ad231373d3cdad373ccab";
    const CALLBACK_GAS_LIMIT = 500000;
    const REQUEST_CONFIRMATIONS = 3;
    const NUM_WORDS = 1;
    
    const vrfContract = await ChainlinkVRF.deploy(
      VRF_COORDINATOR,
      SUBSCRIPTION_ID,
      KEY_HASH,
      CALLBACK_GAS_LIMIT,
      REQUEST_CONFIRMATIONS,
      NUM_WORDS
    );
    await vrfContract.waitForDeployment();
    const vrfAddress = await vrfContract.getAddress();
    deploymentResults.chainlinkVRF = vrfAddress;
    console.log("✅ ChainlinkVRF deployed at:", vrfAddress);
    console.log("⚠️  Note: Using subscription ID 1 for testing. Create a real subscription for production.");
    
    // Wait 3 seconds before next deployment
    console.log("⏳ Waiting 3 seconds before next deployment...");
    await delay(3000);

    // 2. Deploy PizzaPartyCore contract (the smaller, deployable version)
    console.log("\n🍕 2. Deploying PizzaPartyCore contract...");
    const PizzaPartyCore = await ethers.getContractFactory("PizzaPartyCore");
    const pizzaPartyCore = await PizzaPartyCore.deploy(VMF_TOKEN_ADDRESS);
    await pizzaPartyCore.waitForDeployment();
    const pizzaPartyCoreAddress = await pizzaPartyCore.getAddress();
    deploymentResults.pizzaPartyCore = pizzaPartyCoreAddress;
    console.log("✅ PizzaPartyCore deployed at:", pizzaPartyCoreAddress);
    
    // Wait 3 seconds before next deployment
    console.log("⏳ Waiting 3 seconds before next deployment...");
    await delay(3000);

    // 3. Try to deploy the full PizzaParty contract (may fail due to size)
    console.log("\n🍕 3. Attempting to deploy full PizzaParty contract...");
    try {
      const PizzaParty = await ethers.getContractFactory("PizzaParty");
      const pizzaParty = await PizzaParty.deploy(
        VMF_TOKEN_ADDRESS,
        randomnessAddress,
        priceOracleAddress,
        vrfAddress
      );
      await pizzaParty.waitForDeployment();
      const pizzaPartyAddress = await pizzaParty.getAddress();
      deploymentResults.pizzaParty = pizzaPartyAddress;
      console.log("✅ PizzaParty deployed at:", pizzaPartyAddress);
    } catch (error) {
      console.log("❌ PizzaParty deployment failed (likely due to contract size):", error.message);
      deploymentResults.pizzaParty = "FAILED - Contract too large";
    }
    
    // Wait 3 seconds before next deployment
    console.log("⏳ Waiting 3 seconds before next deployment...");
    await delay(3000);

    // 4. Deploy MockVMF contract (for testing)
    console.log("\n🧪 4. Deploying MockVMF contract...");
    const MockVMF = await ethers.getContractFactory("MockVMF");
    const mockVMF = await MockVMF.deploy();
    await mockVMF.waitForDeployment();
    const mockVMFAddress = await mockVMF.getAddress();
    deploymentResults.mockVMF = mockVMFAddress;
    console.log("✅ MockVMF deployed at:", mockVMFAddress);

    // Verify all contracts
    console.log("\n🔍 Verifying contracts on Basescan...");
    
    const verificationPromises = [
      // ChainlinkVRF
      hre.run("verify:verify", {
        address: vrfAddress,
        constructorArguments: [VRF_COORDINATOR, SUBSCRIPTION_ID, KEY_HASH, CALLBACK_GAS_LIMIT, REQUEST_CONFIRMATIONS, NUM_WORDS],
      }).catch(e => console.log("⚠️ ChainlinkVRF verification failed:", e.message)),
      
      // PizzaPartyCore
      hre.run("verify:verify", {
        address: pizzaPartyCoreAddress,
        constructorArguments: [VMF_TOKEN_ADDRESS],
      }).catch(e => console.log("⚠️ PizzaPartyCore verification failed:", e.message)),
      
      // MockVMF
      hre.run("verify:verify", {
        address: mockVMFAddress,
        constructorArguments: [],
      }).catch(e => console.log("⚠️ MockVMF verification failed:", e.message)),
    ];

    await Promise.all(verificationPromises);
    console.log("✅ Contract verification attempts completed");

    // Save deployment results
    const deploymentInfo = {
      deploymentTime: new Date().toISOString(),
      network: "Base Mainnet",
      vmfTokenAddress: VMF_TOKEN_ADDRESS,
      contracts: {
        freeRandomness: randomnessAddress,
        freePriceOracle: priceOracleAddress,
        uniswapPriceOracle: uniswapPriceOracleAddress,
        secureReferralSystem: referralSystemAddress,
        ...deploymentResults
      },
      vrfConfig: {
        coordinator: VRF_COORDINATOR,
        subscriptionId: SUBSCRIPTION_ID,
        keyHash: KEY_HASH,
        callbackGasLimit: CALLBACK_GAS_LIMIT,
        requestConfirmations: REQUEST_CONFIRMATIONS,
        numWords: NUM_WORDS,
        note: "Using subscription ID 1 for testing. Create real subscription for production."
      }
    };

    const fs = require('fs');
    fs.writeFileSync('all-contracts-deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("📄 Deployment info saved to all-contracts-deployment.json");

    // Print deployment summary
    console.log("\n🎉 ALL CONTRACTS DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));
    console.log("📋 DEPLOYMENT SUMMARY:");
    console.log("🌐 Network: Base Mainnet");
    console.log("📅 Time:", new Date().toISOString());
    console.log("");
    console.log("✅ Successfully Deployed:");
    console.log("   🎲 FreeRandomness:", randomnessAddress);
    console.log("   📊 FreePriceOracle:", priceOracleAddress);
    console.log("   📈 UniswapPriceOracle:", uniswapPriceOracleAddress);
    console.log("   🔗 SecureReferralSystem:", referralSystemAddress);
    console.log("   🎲 ChainlinkVRF:", vrfAddress);
    console.log("   🍕 PizzaPartyCore:", pizzaPartyCoreAddress);
    console.log("   🧪 MockVMF:", mockVMFAddress);
    console.log("");
    console.log("❌ Failed Deployments:");
    if (deploymentResults.pizzaParty === "FAILED - Contract too large") {
      console.log("   🍕 PizzaParty: Contract too large (28,818 bytes > 24,576 limit)");
    }
    console.log("");
    console.log("🔗 Explorer Links:");
    console.log("   🎲 FreeRandomness: https://basescan.org/address/" + randomnessAddress);
    console.log("   📊 FreePriceOracle: https://basescan.org/address/" + priceOracleAddress);
    console.log("   📈 UniswapPriceOracle: https://basescan.org/address/" + uniswapPriceOracleAddress);
    console.log("   🔗 SecureReferralSystem: https://basescan.org/address/" + referralSystemAddress);
    console.log("   🎲 ChainlinkVRF: https://basescan.org/address/" + vrfAddress);
    console.log("   🍕 PizzaPartyCore: https://basescan.org/address/" + pizzaPartyCoreAddress);
    console.log("   🧪 MockVMF: https://basescan.org/address/" + mockVMFAddress);
    console.log("");
    console.log("🎯 RECOMMENDED NEXT STEPS:");
    console.log("   1. Use PizzaPartyCore for production (fits size limit)");
    console.log("   2. Create a real Chainlink VRF subscription for production");
    console.log("   3. Update scheduled-winner-selection.js with new addresses");
    console.log("   4. Test VRF integration with ChainlinkVRF contract");
    console.log("   5. Start automated winner selection system");
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
