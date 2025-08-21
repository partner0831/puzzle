require('dotenv').config();
const { ethers } = require("ethers");

async function testGameIntegration() {
  console.log("🧪 Testing Game Integration with Real On-Chain Data...");
  
  // Connect to Base network
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  // Contract addresses
  const PIZZA_PARTY_ADDRESS = "0x8ef20E4C2c2Be6d2E1B800B6dd1F12636A096D63";
  const VMF_TOKEN_ADDRESS = "0x2213414893259b0C48066Acd1763e7fbA97859E5";
  
  // Contract ABIs
  const pizzaPartyABI = [
    "function getCurrentGameId() external view returns (uint256)",
    "function getDailyPlayers(uint256 gameId) external view returns (address[] memory)",
    "function getWeeklyPlayers(uint256 gameId) external view returns (address[] memory)",
    "function getDailyJackpot() external view returns (uint256)",
    "function getWeeklyJackpot() external view returns (uint256)",
    "function getPlayerToppings(address player) external view returns (uint256)",
    "function getTotalToppingsClaimed() external view returns (uint256)",
    "function isDailyDrawReady() external view returns (bool)",
    "function isWeeklyDrawReady() external view returns (bool)",
    "function getEligibleDailyPlayers(uint256 gameId) external view returns (address[] memory)",
    "function getEligibleWeeklyPlayers(uint256 gameId) external view returns (address[] memory)",
    "function getPlayerVMFBalance(address player) external view returns (uint256)",
    "function getMinimumVMFRequired() external view returns (uint256)"
  ];
  
  const vmfTokenABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)"
  ];
  
  try {
    // Connect to contracts
    const pizzaParty = new ethers.Contract(PIZZA_PARTY_ADDRESS, pizzaPartyABI, signer);
    const vmfToken = new ethers.Contract(VMF_TOKEN_ADDRESS, vmfTokenABI, signer);
    
    console.log("✅ Connected to contracts");
    
    // Test 1: Get current game stats
    console.log("\n📊 Test 1: Current Game Stats");
    const currentGameId = await pizzaParty.getCurrentGameId();
    console.log(`🎮 Current Game ID: ${currentGameId}`);
    
    // Test 2: Get jackpot amounts
    console.log("\n💰 Test 2: Jackpot Amounts");
    const dailyJackpot = await pizzaParty.getDailyJackpot();
    const weeklyJackpot = await pizzaParty.getWeeklyJackpot();
    console.log(`💰 Daily Jackpot: ${ethers.formatEther(dailyJackpot)} VMF`);
    console.log(`💰 Weekly Jackpot: ${ethers.formatEther(weeklyJackpot)} VMF`);
    
    // Test 3: Get toppings data
    console.log("\n🍕 Test 3: Toppings Data");
    const totalToppingsClaimed = await pizzaParty.getTotalToppingsClaimed();
    console.log(`🍕 Total Toppings Claimed: ${ethers.formatEther(totalToppingsClaimed)} VMF`);
    
    // Test 4: Get player data
    console.log("\n👥 Test 4: Player Data");
    const dailyPlayers = await pizzaParty.getDailyPlayers(currentGameId);
    const weeklyPlayers = await pizzaParty.getWeeklyPlayers(currentGameId);
    console.log(`📅 Daily Players: ${dailyPlayers.length}`);
    console.log(`📅 Weekly Players: ${weeklyPlayers.length}`);
    
    // Test 5: Check draw readiness
    console.log("\n🎯 Test 5: Draw Readiness");
    const dailyDrawReady = await pizzaParty.isDailyDrawReady();
    const weeklyDrawReady = await pizzaParty.isWeeklyDrawReady();
    console.log(`📅 Daily Draw Ready: ${dailyDrawReady}`);
    console.log(`📅 Weekly Draw Ready: ${weeklyDrawReady}`);
    
    // Test 6: Get eligible players
    console.log("\n🏆 Test 6: Eligible Players");
    const eligibleDailyPlayers = await pizzaParty.getEligibleDailyPlayers(currentGameId);
    const eligibleWeeklyPlayers = await pizzaParty.getEligibleWeeklyPlayers(currentGameId);
    console.log(`📅 Eligible Daily Players: ${eligibleDailyPlayers.length}`);
    console.log(`📅 Eligible Weekly Players: ${eligibleWeeklyPlayers.length}`);
    
    // Test 7: Check VMF requirements
    console.log("\n🪙 Test 7: VMF Requirements");
    const minVMFRequired = await pizzaParty.getMinimumVMFRequired();
    console.log(`🪙 Minimum VMF Required: ${ethers.formatEther(minVMFRequired)} VMF`);
    
    // Test 8: Check signer's VMF balance
    console.log("\n👤 Test 8: Signer VMF Balance");
    const signerVMFBalance = await vmfToken.balanceOf(signer.address);
    console.log(`👤 Signer VMF Balance: ${ethers.formatEther(signerVMFBalance)} VMF`);
    
    // Test 9: Check signer's toppings
    console.log("\n🍕 Test 9: Signer Toppings");
    const signerToppings = await pizzaParty.getPlayerToppings(signer.address);
    console.log(`🍕 Signer Toppings: ${ethers.formatEther(signerToppings)} VMF`);
    
    console.log("\n✅ All tests completed successfully!");
    console.log("\n🎯 Integration Summary:");
    console.log(`✅ Pizza Party Contract: ${PIZZA_PARTY_ADDRESS}`);
    console.log(`✅ VMF Token Contract: ${VMF_TOKEN_ADDRESS}`);
    console.log(`✅ Current Game ID: ${currentGameId}`);
    console.log(`✅ Daily Players: ${dailyPlayers.length}`);
    console.log(`✅ Weekly Players: ${weeklyPlayers.length}`);
    console.log(`✅ Daily Jackpot: ${ethers.formatEther(dailyJackpot)} VMF`);
    console.log(`✅ Weekly Jackpot: ${ethers.formatEther(weeklyJackpot)} VMF`);
    console.log(`✅ Total Toppings: ${ethers.formatEther(totalToppingsClaimed)} VMF`);
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    throw error;
  }
}

if (require.main === module) {
  testGameIntegration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { testGameIntegration };
