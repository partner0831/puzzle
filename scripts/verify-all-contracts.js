require('dotenv').config();
const { run } = require("hardhat");

async function main() {
  console.log("🔍 Starting verification of all Pizza Party contracts on BaseScan...\n");

  const contracts = [
    // Core Contracts
    {
      name: "PizzaPartyCore",
      address: "0xCD8a3a397CdE223c47602d2C37a3b8a5B99a6460",
      constructorArgs: ["0x2213414893259b0C48066Acd1763e7fbA97859E5"], // VMF Token address
    },
    
    // Advanced Modular Contracts
    {
      name: "PizzaPartyReferral",
      address: "0xb976e0400e88f78AA85029D138fFD11A65de9CE8",
      constructorArgs: ["0x2213414893259b0C48066Acd1763e7fbA97859E5"], // VMF Token address
    },
    {
      name: "PizzaPartyDynamicPricing",
      address: "0x0F5a91907039eecebEA78ad2d327C7521d4F7892",
      constructorArgs: [
        "0x2213414893259b0C48066Acd1763e7fbA97859E5", // VMF Token address
        "0xAA43fE819C0103fE820c04259929b3f344AfBfa3"  // FreePriceOracle address
      ],
    },
    {
      name: "PizzaPartyLoyalty",
      address: "0xC8a44e0587f7BeDa623b75DF5415E85Bf1163ac7",
      constructorArgs: ["0x2213414893259b0C48066Acd1763e7fbA97859E5"], // VMF Token address
    },
    {
      name: "PizzaPartyAdvancedRandomness",
      address: "0xCcF33C77A65849e19Df6e66A9daEBC112D5BDBCE",
      constructorArgs: [], // No constructor arguments
    },
    {
      name: "PizzaPartyAnalytics",
      address: "0xf32156203A70Bbf1e3db6C664F3F7eA8310a8841",
      constructorArgs: ["0x2213414893259b0C48066Acd1763e7fbA97859E5"], // VMF Token address
    },
    {
      name: "PizzaPartyWeeklyChallenges",
      address: "0x87fee21FB855Ae44600B79b38709E4587f5b60CF",
      constructorArgs: ["0x2213414893259b0C48066Acd1763e7fbA97859E5"], // VMF Token address
    },
    
    // Legacy/Support Contracts
    {
      name: "FreeRandomness",
      address: "0xF64dF5C5c399c051210f02309A6cB12cB7797e88",
      constructorArgs: [], // No constructor arguments
    },
    {
      name: "FreePriceOracle",
      address: "0xAA43fE819C0103fE820c04259929b3f344AfBfa3",
      constructorArgs: [], // No constructor arguments
    },
    {
      name: "UniswapPriceOracle",
      address: "0xA5deaebA77225546dE3C363F695319356E33B7D6",
      constructorArgs: [], // No constructor arguments
    },
    {
      name: "SecureReferralSystem",
      address: "0xDfFa13C23786ecf2Fc681e74e351b05c9C33f367",
      constructorArgs: ["0xF64dF5C5c399c051210f02309A6cB12cB7797e88"], // FreeRandomness address
    },
    {
      name: "ChainlinkVRF",
      address: "0xefAe49039ADB963b1183869D1632D4CbC8F0603b",
      constructorArgs: [
        "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed", // VRF Coordinator
        "1", // Subscription ID (temporary for testing)
        "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f", // Key Hash
        "2500000", // Callback Gas Limit
        "3", // Request Confirmations
        "1" // Number of Words
      ],
    },
    {
      name: "MockVMF",
      address: "0x8349a17aa324628C5018fDF8aE24399Bb5EA7D8C",
      constructorArgs: [], // No constructor arguments
    }
  ];

  const results = {
    successful: [],
    failed: []
  };

  for (const contract of contracts) {
    console.log(`🔍 Verifying ${contract.name} at ${contract.address}...`);
    
    try {
      await run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.constructorArgs,
        network: "base"
      });
      
      console.log(`✅ ${contract.name} verified successfully!`);
      results.successful.push(contract.name);
      
      // Add delay between verifications to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log(`❌ ${contract.name} verification failed:`, error.message);
      results.failed.push({
        name: contract.name,
        error: error.message
      });
      
      // Add delay even on failure
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(""); // Empty line for readability
  }

  // Summary
  console.log("📊 VERIFICATION SUMMARY:");
  console.log("=".repeat(50));
  console.log(`✅ Successfully verified: ${results.successful.length} contracts`);
  console.log(`❌ Failed to verify: ${results.failed.length} contracts`);
  
  if (results.successful.length > 0) {
    console.log("\n✅ Successfully verified contracts:");
    results.successful.forEach(name => console.log(`   - ${name}`));
  }
  
  if (results.failed.length > 0) {
    console.log("\n❌ Failed verifications:");
    results.failed.forEach(item => console.log(`   - ${item.name}: ${item.error}`));
  }
  
  console.log("\n🔗 BaseScan Links:");
  console.log("=".repeat(50));
  contracts.forEach(contract => {
    const status = results.successful.includes(contract.name) ? "✅" : "❌";
    console.log(`${status} ${contract.name}: https://basescan.org/address/${contract.address}#code`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification script failed:", error);
    process.exit(1);
  });
