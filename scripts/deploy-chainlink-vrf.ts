import { ethers } from "hardhat";
import { config } from "dotenv";

config();

async function main() {
  console.log("🚀 Deploying Chainlink VRF Integration...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Chainlink VRF Configuration for Base Sepolia
  // These values need to be updated based on the actual Chainlink VRF deployment on Base Sepolia
  const VRF_COORDINATOR = "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed"; // Base Sepolia VRF Coordinator
  const SUBSCRIPTION_ID = 0; // You need to create a subscription and get the ID
  const KEY_HASH = "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f"; // Base Sepolia key hash
  const CALLBACK_GAS_LIMIT = 500000; // Gas limit for callback
  const REQUEST_CONFIRMATIONS = 3; // Number of confirmations
  const NUM_WORDS = 10; // Number of random words to request

  console.log("📋 VRF Configuration:");
  console.log("  Coordinator:", VRF_COORDINATOR);
  console.log("  Subscription ID:", SUBSCRIPTION_ID);
  console.log("  Key Hash:", KEY_HASH);
  console.log("  Callback Gas Limit:", CALLBACK_GAS_LIMIT);
  console.log("  Request Confirmations:", REQUEST_CONFIRMATIONS);
  console.log("  Num Words:", NUM_WORDS);

  // Deploy Chainlink VRF contract
  console.log("\n🔧 Deploying ChainlinkVRF contract...");
  const ChainlinkVRF = await ethers.getContractFactory("ChainlinkVRF");
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
  console.log("✅ ChainlinkVRF deployed to:", vrfAddress);

  // Deploy Pizza Party contract with VRF integration
  console.log("\n🍕 Deploying PizzaParty contract with VRF integration...");
  
  // Get existing contract addresses (you'll need to update these)
  const VMF_TOKEN = "0x0000000000000000000000000000000000000000"; // Update with actual VMF token address
  const RANDOMNESS_CONTRACT = "0x0000000000000000000000000000000000000000"; // Update with existing randomness contract
  const PRICE_ORACLE = "0x0000000000000000000000000000000000000000"; // Update with existing price oracle

  const PizzaParty = await ethers.getContractFactory("PizzaParty");
  const pizzaParty = await PizzaParty.deploy(
    VMF_TOKEN,
    RANDOMNESS_CONTRACT,
    PRICE_ORACLE,
    vrfAddress // VRF contract address
  );

  await pizzaParty.waitForDeployment();
  const pizzaPartyAddress = await pizzaParty.getAddress();
  console.log("✅ PizzaParty deployed to:", pizzaPartyAddress);

  // Set Pizza Party contract address in VRF contract
  console.log("\n🔗 Linking VRF contract to Pizza Party...");
  const setPizzaPartyTx = await vrfContract.setPizzaPartyContract(pizzaPartyAddress);
  await setPizzaPartyTx.wait();
  console.log("✅ VRF contract linked to Pizza Party");

  // Verify the setup
  console.log("\n🔍 Verifying setup...");
  const linkedPizzaParty = await vrfContract.pizzaPartyContract();
  console.log("  VRF -> Pizza Party:", linkedPizzaParty);
  
  const vrfConfig = await vrfContract.getVRFConfig();
  console.log("  VRF Config:", {
    coordinator: vrfConfig[0],
    subscriptionId: vrfConfig[1],
    keyHash: vrfConfig[2],
    gasLimit: vrfConfig[3],
    confirmations: vrfConfig[4],
    words: vrfConfig[5]
  });

  console.log("\n🎉 Chainlink VRF Integration Deployment Complete!");
  console.log("\n📋 Deployment Summary:");
  console.log("  ChainlinkVRF:", vrfAddress);
  console.log("  PizzaParty:", pizzaPartyAddress);
  console.log("  VRF Coordinator:", VRF_COORDINATOR);
  console.log("  Subscription ID:", SUBSCRIPTION_ID);

  console.log("\n⚠️  IMPORTANT NEXT STEPS:");
  console.log("  1. Create a Chainlink VRF subscription at https://vrf.chain.link/");
  console.log("  2. Fund the subscription with LINK tokens");
  console.log("  3. Update the SUBSCRIPTION_ID in this script with your actual subscription ID");
  console.log("  4. Add the VRF contract as a consumer to your subscription");
  console.log("  5. Test the VRF integration with a small amount first");

  console.log("\n🔧 Usage:");
  console.log("  - Call requestDailyVRF() to request daily winner selection");
  console.log("  - Call requestWeeklyVRF() to request weekly winner selection");
  console.log("  - Winners will be automatically selected and prizes distributed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
