const { ethers } = require("hardhat");

async function main() {
  console.log("🔗 Integrating VRF with Existing Pizza Party Contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Your existing VRF contract address
  const VRF_CONTRACT_ADDRESS = "0xCCa74Fb01e4aec664b8F57Db1Ce6b702AF8f5a59";

  // You'll need to provide your existing Pizza Party contract address
  // Replace this with your actual Pizza Party contract address
  const EXISTING_PIZZA_PARTY_ADDRESS = "YOUR_EXISTING_PIZZA_PARTY_CONTRACT_ADDRESS";

  if (EXISTING_PIZZA_PARTY_ADDRESS === "YOUR_EXISTING_PIZZA_PARTY_CONTRACT_ADDRESS") {
    console.log("\n❌ ERROR: Please update the script with your existing Pizza Party contract address");
    console.log("Edit this file and replace 'YOUR_EXISTING_PIZZA_PARTY_CONTRACT_ADDRESS' with your actual contract address");
    process.exit(1);
  }

  try {
    console.log("\n🔍 Connecting to existing Pizza Party contract...");
    const pizzaParty = await ethers.getContractAt("PizzaParty", EXISTING_PIZZA_PARTY_ADDRESS);
    console.log("✅ Connected to Pizza Party contract:", EXISTING_PIZZA_PARTY_ADDRESS);

    console.log("\n🔍 Connecting to VRF contract...");
    const vrfContract = await ethers.getContractAt("ChainlinkVRF", VRF_CONTRACT_ADDRESS);
    console.log("✅ Connected to VRF contract:", VRF_CONTRACT_ADDRESS);

    // Check if the Pizza Party contract has VRF integration
    console.log("\n🔍 Checking VRF integration status...");
    
    try {
      const useVRF = await pizzaParty.useVRF();
      console.log("✅ VRF integration detected. VRF Enabled:", useVRF);
      
      // Get current VRF contract
      const currentVRF = await pizzaParty.vrfContract();
      console.log("✅ Current VRF contract:", currentVRF);
      
      if (currentVRF === VRF_CONTRACT_ADDRESS) {
        console.log("✅ VRF contract is already properly linked!");
      } else {
        console.log("🔄 Updating VRF contract address...");
        const setVRFTx = await pizzaParty.setVRFContract(VRF_CONTRACT_ADDRESS);
        await setVRFTx.wait();
        console.log("✅ VRF contract address updated");
      }
      
    } catch (error) {
      console.log("⚠️  VRF integration not detected in existing contract");
      console.log("This means your existing Pizza Party contract doesn't have VRF integration");
      console.log("\n💡 OPTIONS:");
      console.log("1. Deploy a new Pizza Party contract with VRF integration (may have size issues)");
      console.log("2. Upgrade your existing contract to include VRF integration");
      console.log("3. Use the VRF contract directly for winner selection");
      
      console.log("\n🔧 RECOMMENDED: Use VRF contract directly");
      console.log("Since your VRF contract is deployed, you can use it directly:");
      console.log("- Call requestDailyRandomness() on VRF contract");
      console.log("- Call requestWeeklyRandomness() on VRF contract");
      console.log("- Winners will be automatically selected and processed");
    }

    // Set Pizza Party contract address in VRF contract
    console.log("\n🔗 Linking VRF contract to Pizza Party...");
    const setPizzaPartyTx = await vrfContract.setPizzaPartyContract(EXISTING_PIZZA_PARTY_ADDRESS);
    await setPizzaPartyTx.wait();
    console.log("✅ VRF contract linked to Pizza Party");

    // Verify the setup
    console.log("\n🔍 Verifying setup...");
    const linkedPizzaParty = await vrfContract.pizzaPartyContract();
    console.log("  VRF -> Pizza Party:", linkedPizzaParty);

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

    console.log("\n🎉 VRF Integration Complete!");
    console.log("\n📋 Integration Summary:");
    console.log("  Existing Pizza Party:", EXISTING_PIZZA_PARTY_ADDRESS);
    console.log("  ChainlinkVRF:", VRF_CONTRACT_ADDRESS);
    console.log("  VRF -> Pizza Party Link: ✅");

    console.log("\n🔧 Usage Instructions:");
    console.log("1. Request daily winners: await vrfContract.requestDailyRandomness(gameId, eligiblePlayers)");
    console.log("2. Request weekly winners: await vrfContract.requestWeeklyRandomness(gameId, eligiblePlayers)");
    console.log("3. Check request status: await vrfContract.isRequestFulfilled(requestId)");
    console.log("4. Get winners: await vrfContract.getRequest(requestId)");

    console.log("\n⚠️  IMPORTANT NOTES:");
    console.log("- VRF contract will automatically call Pizza Party to process winners");
    console.log("- Make sure Pizza Party contract has the required functions");
    console.log("- Test with small amounts first");

    // Save integration info to a file
    const integrationInfo = {
      network: "base",
      deployer: deployer.address,
      contracts: {
        existingPizzaParty: EXISTING_PIZZA_PARTY_ADDRESS,
        chainlinkVRF: VRF_CONTRACT_ADDRESS
      },
      integration: {
        vrfToPizzaParty: linkedPizzaParty,
        timestamp: new Date().toISOString()
      }
    };

    const fs = require('fs');
    fs.writeFileSync('vrf-integration.json', JSON.stringify(integrationInfo, null, 2));
    console.log("\n💾 Integration info saved to: vrf-integration.json");

  } catch (error) {
    console.error("❌ Integration failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Integration failed:", error);
    process.exit(1);
  });
