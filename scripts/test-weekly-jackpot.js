require('dotenv').config();
const { ethers } = require('ethers');

async function testWeeklyJackpot() {
  console.log('🧪 Testing getWeeklyJackpot Function');
  
  const PIZZA_PARTY_CORE_ADDRESS = "0x8940540e99a1F1f024182a1aD107BF52D0218f44";
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || 'https://mainnet.base.org');

  try {
    // Create contract instance with minimal ABI
    const contract = new ethers.Contract(
      PIZZA_PARTY_CORE_ADDRESS,
      [
        'function getWeeklyJackpot() view returns (uint256)',
        'function getWeeklyToppingsPool() view returns (uint256)',
        'function getTotalToppingsClaimed() view returns (uint256)'
      ],
      provider
    );

    console.log('\n🔍 Testing getWeeklyJackpot...');
    
    try {
      const weeklyJackpot = await contract.getWeeklyJackpot();
      console.log(`✅ getWeeklyJackpot(): ${weeklyJackpot.toString()}`);
      
      // Format as VMF
      const weeklyJackpotFormatted = ethers.formatUnits(weeklyJackpot, 18);
      console.log(`✅ getWeeklyJackpot() formatted: ${weeklyJackpotFormatted} VMF`);
      
    } catch (error) {
      console.log(`❌ getWeeklyJackpot(): ${error.message}`);
    }

    try {
      const toppingsPool = await contract.getWeeklyToppingsPool();
      console.log(`✅ getWeeklyToppingsPool(): ${toppingsPool.toString()}`);
    } catch (error) {
      console.log(`❌ getWeeklyToppingsPool(): ${error.message}`);
    }

    try {
      const totalToppings = await contract.getTotalToppingsClaimed();
      console.log(`✅ getTotalToppingsClaimed(): ${totalToppings.toString()}`);
    } catch (error) {
      console.log(`❌ getTotalToppingsClaimed(): ${error.message}`);
    }

    console.log('\n🎉 Test completed!');

  } catch (error) {
    console.error('❌ Error testing contract:', error);
  }
}

// Run if called directly
if (require.main === module) {
  testWeeklyJackpot()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testWeeklyJackpot };
