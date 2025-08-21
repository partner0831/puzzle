const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Pizza Party Contract with Full VRF Integration...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Your existing VRF contract address
  const VRF_CONTRACT_ADDRESS = "0xCCa74Fb01e4aec664b8F57Db1Ce6b702AF8f5a59";

  // Deploy mock contracts for testing (you can replace these with your actual contracts)
  console.log("\n🔧 Deploying Mock VMF Token...");
  const MockVMF = await ethers.getContractFactory("MockVMF");
  const mockVMF = await MockVMF.deploy();
  await mockVMF.waitForDeployment();
  const mockVMFAddress = await mockVMF.getAddress();
  console.log("✅ MockVMF deployed to:", mockVMFAddress);

  console.log("\n🔧 Deploying Free Randomness Contract...");
  const FreeRandomness = await ethers.getContractFactory("FreeRandomness");
  const freeRandomness = await FreeRandomness.deploy();
  await freeRandomness.waitForDeployment();
  const freeRandomnessAddress = await freeRandomness.getAddress();
  console.log("✅ FreeRandomness deployed to:", freeRandomnessAddress);

  console.log("\n🔧 Deploying Free Price Oracle...");
  const FreePriceOracle = await ethers.getContractFactory("FreePriceOracle");
  const freePriceOracle = await FreePriceOracle.deploy();
  await freePriceOracle.waitForDeployment();
  const freePriceOracleAddress = await freePriceOracle.getAddress();
  console.log("✅ FreePriceOracle deployed to:", freePriceOracleAddress);

  // Deploy Pizza Party contract with VRF integration
  console.log("\n🍕 Deploying Pizza Party Contract with VRF Integration...");
  const PizzaParty = await ethers.getContractFactory("PizzaParty");
  const pizzaParty = await PizzaParty.deploy(
    mockVMFAddress,        // VMF Token
    freeRandomnessAddress, // Randomness Contract
    freePriceOracleAddress, // Price Oracle
    VRF_CONTRACT_ADDRESS   // VRF Contract
  );

  await pizzaParty.waitForDeployment();
  const pizzaPartyAddress = await pizzaParty.getAddress();
  console.log("✅ PizzaParty deployed to:", pizzaPartyAddress);

  // Set Pizza Party contract address in VRF contract
  console.log("\n🔗 Linking VRF contract to Pizza Party...");
  const vrfContract = await ethers.getContractAt("ChainlinkVRF", VRF_CONTRACT_ADDRESS);
  const setPizzaPartyTx = await vrfContract.setPizzaPartyContract(pizzaPartyAddress);
  await setPizzaPartyTx.wait();
  console.log("✅ VRF contract linked to Pizza Party");

  // Verify the setup
  console.log("\n🔍 Verifying setup...");
  const linkedPizzaParty = await vrfContract.pizzaPartyContract();
  console.log("  VRF -> Pizza Party:", linkedPizzaParty);
  
  const useVRF = await pizzaParty.useVRF();
  console.log("  VRF Enabled:", useVRF);

  // Get VRF configuration
  const vrfConfig = await vrfContract.getVRFConfig();
  console.log("  VRF Config:", {
    coordinator: vrfConfig[0],
    subscriptionId: vrfConfig[1],
    keyHash: vrfConfig[2],
    gasLimit: vrfConfig[3],
    confirmations: vrfConfig[4],
    words: vrfConfig[5]
  });

  console.log("\n🎉 Pizza Party VRF Integration Deployment Complete!");
  console.log("\n📋 Deployment Summary:");
  console.log("  MockVMF:", mockVMFAddress);
  console.log("  FreeRandomness:", freeRandomnessAddress);
  console.log("  FreePriceOracle:", freePriceOracleAddress);
  console.log("  PizzaParty:", pizzaPartyAddress);
  console.log("  ChainlinkVRF:", VRF_CONTRACT_ADDRESS);

  console.log("\n🔧 Usage Instructions:");
  console.log("  1. Request daily winners: await pizzaParty.requestDailyVRF()");
  console.log("  2. Request weekly winners: await pizzaParty.requestWeeklyVRF()");
  console.log("  3. Toggle VRF: await pizzaParty.setUseVRF(true/false)");
  console.log("  4. Check VRF status: await pizzaParty.useVRF()");

  console.log("\n⚠️  IMPORTANT NOTES:");
  console.log("  - VRF is enabled by default");
  console.log("  - Legacy randomness functions are still available");
  console.log("  - You can switch between VRF and legacy using setUseVRF()");
  console.log("  - Winners are automatically selected and prizes distributed");

  // Save deployment addresses to a file
  const deploymentInfo = {
    network: "base",
    deployer: deployer.address,
    contracts: {
      mockVMF: mockVMFAddress,
      freeRandomness: freeRandomnessAddress,
      freePriceOracle: freePriceOracleAddress,
      pizzaParty: pizzaPartyAddress,
      chainlinkVRF: VRF_CONTRACT_ADDRESS
    },
    timestamp: new Date().toISOString()
  };

  const fs = require('fs');
  fs.writeFileSync('deployment-vrf.json', JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 Deployment info saved to: deployment-vrf.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
