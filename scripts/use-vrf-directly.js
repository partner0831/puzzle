const { ethers } = require("hardhat");

async function main() {
  console.log("🎲 Using VRF Contract Directly for Winner Selection...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Your VRF contract address
  const VRF_CONTRACT_ADDRESS = "0xCCa74Fb01e4aec664b8F57Db1Ce6b702AF8f5a59";

  try {
    // Connect to VRF contract
    console.log("\n🔗 Connecting to VRF contract...");
    const vrfContract = await ethers.getContractAt("ChainlinkVRF", VRF_CONTRACT_ADDRESS);
    console.log("✅ Connected to VRF contract:", VRF_CONTRACT_ADDRESS);

    // Get VRF configuration
    console.log("\n📋 VRF Configuration:");
    const vrfConfig = await vrfContract.getVRFConfig();
    console.log("  Coordinator:", vrfConfig[0]);
    console.log("  Subscription ID:", vrfConfig[1]);
    console.log("  Key Hash:", vrfConfig[2]);
    console.log("  Gas Limit:", vrfConfig[3]);
    console.log("  Confirmations:", vrfConfig[4]);
    console.log("  Num Words:", vrfConfig[5]);

    // Example eligible players (replace with actual player addresses)
    const examplePlayers = [
      "0x1234567890123456789012345678901234567890",
      "0x2345678901234567890123456789012345678901",
      "0x3456789012345678901234567890123456789012",
      "0x4567890123456789012345678901234567890123",
      "0x5678901234567890123456789012345678901234"
    ];

    const gameId = 1;

    console.log("\n🎯 Example Usage:");

    // Example 1: Request Daily Winners
    console.log("\n1️⃣ Requesting Daily Winners (8 winners)...");
    try {
      const dailyRequestId = await vrfContract.requestDailyRandomness(gameId, examplePlayers);
      console.log("✅ Daily VRF request submitted!");
      console.log("   Request ID:", dailyRequestId);
      console.log("   Game ID:", gameId);
      console.log("   Eligible Players:", examplePlayers.length);
      
      // Check request status
      const dailyRequest = await vrfContract.getRequest(dailyRequestId);
      console.log("   Request Status:", dailyRequest.fulfilled ? "Fulfilled" : "Pending");
      console.log("   Game Type:", dailyRequest.gameType);
      
    } catch (error) {
      console.log("❌ Daily request failed:", error.message);
    }

    // Example 2: Request Weekly Winners
    console.log("\n2️⃣ Requesting Weekly Winners (10 winners)...");
    try {
      const weeklyRequestId = await vrfContract.requestWeeklyRandomness(gameId, examplePlayers);
      console.log("✅ Weekly VRF request submitted!");
      console.log("   Request ID:", weeklyRequestId);
      console.log("   Game ID:", gameId);
      console.log("   Eligible Players:", examplePlayers.length);
      
      // Check request status
      const weeklyRequest = await vrfContract.getRequest(weeklyRequestId);
      console.log("   Request Status:", weeklyRequest.fulfilled ? "Fulfilled" : "Pending");
      console.log("   Game Type:", weeklyRequest.gameType);
      
    } catch (error) {
      console.log("❌ Weekly request failed:", error.message);
    }

    // Example 3: Check All Requests
    console.log("\n3️⃣ Checking All Requests...");
    const requestCounter = await vrfContract.requestCounter();
    console.log("   Total Requests:", requestCounter);

    for (let i = 1; i <= Math.min(Number(requestCounter), 5); i++) {
      try {
        const request = await vrfContract.getRequest(i);
        console.log(`   Request ${i}:`, {
          gameId: request.gameId,
          gameType: request.gameType,
          fulfilled: request.fulfilled,
          eligiblePlayers: request.eligiblePlayers.length
        });
      } catch (error) {
        console.log(`   Request ${i}: Error -`, error.message);
      }
    }

    console.log("\n🎉 VRF Usage Examples Complete!");
    console.log("\n📋 Key Functions Available:");
    console.log("  • requestDailyRandomness(gameId, eligiblePlayers)");
    console.log("  • requestWeeklyRandomness(gameId, eligiblePlayers)");
    console.log("  • getRequest(requestId)");
    console.log("  • isRequestFulfilled(requestId)");
    console.log("  • getVRFConfig()");

    console.log("\n⚠️  Important Notes:");
    console.log("  • VRF requests take 1-2 minutes to fulfill");
    console.log("  • Winners are automatically selected when randomness is received");
    console.log("  • Check request status before processing winners");
    console.log("  • Ensure eligible players array is not empty");

    console.log("\n🔧 Production Usage:");
    console.log("1. Get actual eligible players from your game");
    console.log("2. Call requestDailyRandomness() or requestWeeklyRandomness()");
    console.log("3. Wait for fulfillment (1-2 minutes)");
    console.log("4. Check getRequest() for winners");
    console.log("5. Process prizes for selected winners");

    // Save usage info
    const usageInfo = {
      vrfContract: VRF_CONTRACT_ADDRESS,
      deployer: deployer.address,
      examples: {
        dailyRequest: "requestDailyRandomness(gameId, eligiblePlayers)",
        weeklyRequest: "requestWeeklyRandomness(gameId, eligiblePlayers)",
        checkStatus: "getRequest(requestId)",
        checkFulfilled: "isRequestFulfilled(requestId)"
      },
      timestamp: new Date().toISOString()
    };

    const fs = require('fs');
    fs.writeFileSync('vrf-usage-guide.json', JSON.stringify(usageInfo, null, 2));
    console.log("\n💾 Usage guide saved to: vrf-usage-guide.json");

  } catch (error) {
    console.error("❌ VRF usage failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ VRF usage failed:", error);
    process.exit(1);
  });
