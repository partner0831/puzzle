require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying ALL Pizza Party Smart Contracts to Base Network...");
  console.log("📅 Deployment Time:", new Date().toISOString());

  // VMF Token contract address on Base network
  const VMF_TOKEN_ADDRESS = "0x2213414893259b0C48066Acd1763e7fbA97859E5";

  console.log("📄 VMF Token Address:", VMF_TOKEN_ADDRESS);
  console.log("🌐 Network: Base Mainnet");

  const deploymentResults = {};

  // Helper function to add delay between deployments
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // 1. Deploy FreeRandomness contract
    console.log("\n🎲 1. Deploying FreeRandomness contract...");
    const FreeRandomness = await ethers.getContractFactory("FreeRandomness");
    const randomnessContract = await FreeRandomness.deploy();
    await randomnessContract.waitForDeployment();
    const randomnessAddress = await randomnessContract.getAddress();
    deploymentResults.freeRandomness = randomnessAddress;
    console.log("✅ FreeRandomness deployed at:", randomnessAddress);
    
    // Wait 3 seconds before next deployment
    console.log("⏳ Waiting 3 seconds before next deployment...");
    await delay(3000);

    // 2. Deploy FreePriceOracle contract
    console.log("\n📊 2. Deploying FreePriceOracle contract...");
    const FreePriceOracle = await ethers.getContractFactory("FreePriceOracle");
    const priceOracle = await FreePriceOracle.deploy();
    await priceOracle.waitForDeployment();
    const priceOracleAddress = await priceOracle.getAddress();
    deploymentResults.freePriceOracle = priceOracleAddress;
    console.log("✅ FreePriceOracle deployed at:", priceOracleAddress);
    
    // Wait 3 seconds before next deployment
    console.log("⏳ Waiting 3 seconds before next deployment...");
    await delay(3000);

    // 3. Deploy UniswapPriceOracle contract
    console.log("\n📈 3. Deploying UniswapPriceOracle contract...");
    const UniswapPriceOracle = await ethers.getContractFactory("UniswapPriceOracle");
    const uniswapPriceOracle = await UniswapPriceOracle.deploy();
    await uniswapPriceOracle.waitForDeployment();
    const uniswapPriceOracleAddress = await uniswapPriceOracle.getAddress();
    deploymentResults.uniswapPriceOracle = uniswapPriceOracleAddress;
    console.log("✅ UniswapPriceOracle deployed at:", uniswapPriceOracleAddress);
    
    // Wait 3 seconds before next deployment
    console.log("⏳ Waiting 3 seconds before next deployment...");
    await delay(3000);



    // 4. Deploy ChainlinkVRF contract
    console.log("\n🎲 4. Deploying ChainlinkVRF contract...");
    const ChainlinkVRF = await ethers.getContractFactory("ChainlinkVRF");
    
    // Chainlink VRF v2.5 configuration for Base mainnet
    const VRF_COORDINATOR = "0xd5d517abe5cf79b7e95ec98db0f0277788aff634";
    const SUBSCRIPTION_ID = "66063754969138181428436446139853957057923129391945579696602182296131592405980";
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
    
    // Wait 3 seconds before next deployment
    console.log("⏳ Waiting 3 seconds before next deployment...");
    await delay(3000);

    // 5. Deploy PizzaPartyCore contract (the smaller, deployable version)
    console.log("\n🍕 5. Deploying PizzaPartyCore contract...");
    const PizzaPartyCore = await ethers.getContractFactory("PizzaPartyCore");
    const pizzaPartyCore = await PizzaPartyCore.deploy(VMF_TOKEN_ADDRESS);
    await pizzaPartyCore.waitForDeployment();
    const pizzaPartyCoreAddress = await pizzaPartyCore.getAddress();
    deploymentResults.pizzaPartyCore = pizzaPartyCoreAddress;
    console.log("✅ PizzaPartyCore deployed at:", pizzaPartyCoreAddress);
    
    // Wait 3 seconds before next deployment
    console.log("⏳ Waiting 3 seconds before next deployment...");
    await delay(3000);

    // 6. Try to deploy the full PizzaParty contract (may fail due to size)
    console.log("\n🍕 6. Attempting to deploy full PizzaParty contract...");
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



    // Verify all contracts
    console.log("\n🔍 Verifying contracts on Basescan...");
    
    const verificationPromises = [
      // FreeRandomness
      hre.run("verify:verify", {
        address: randomnessAddress,
        constructorArguments: [],
      }).catch(e => console.log("⚠️ FreeRandomness verification failed:", e.message)),
      
      // FreePriceOracle
      hre.run("verify:verify", {
        address: priceOracleAddress,
        constructorArguments: [],
      }).catch(e => console.log("⚠️ FreePriceOracle verification failed:", e.message)),
      
      // UniswapPriceOracle
      hre.run("verify:verify", {
        address: uniswapPriceOracleAddress,
        constructorArguments: [],
      }).catch(e => console.log("⚠️ UniswapPriceOracle verification failed:", e.message)),
      

      
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
      

    ];

    await Promise.all(verificationPromises);
    console.log("✅ Contract verification attempts completed");

    // Save deployment results
    const deploymentInfo = {
      deploymentTime: new Date().toISOString(),
      network: "Base Mainnet",
      vmfTokenAddress: VMF_TOKEN_ADDRESS,
      contracts: deploymentResults,
      vrfConfig: {
        coordinator: VRF_COORDINATOR,
        subscriptionId: SUBSCRIPTION_ID,
        keyHash: KEY_HASH,
        callbackGasLimit: CALLBACK_GAS_LIMIT,
        requestConfirmations: REQUEST_CONFIRMATIONS,
        numWords: NUM_WORDS
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

    console.log("   🎲 ChainlinkVRF:", vrfAddress);
    console.log("   🍕 PizzaPartyCore:", pizzaPartyCoreAddress);

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

    console.log("   🎲 ChainlinkVRF: https://basescan.org/address/" + vrfAddress);
    console.log("   🍕 PizzaPartyCore: https://basescan.org/address/" + pizzaPartyCoreAddress);

    console.log("");
    console.log("🎯 RECOMMENDED NEXT STEPS:");
    console.log("   1. Use PizzaPartyCore for production (fits size limit)");
    console.log("   2. Update scheduled-winner-selection.js with new addresses");
    console.log("   3. Test VRF integration with ChainlinkVRF contract");
    console.log("   4. Start automated winner selection system");
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
