require('dotenv').config();
const { ethers } = require('ethers');

async function testNewContract() {
  console.log('🧪 Testing New PizzaPartyCore Contract');
  
  const PIZZA_PARTY_CORE_ADDRESS = "0x8940540e99a1F1f024182a1aD107BF52D0218f44";
  const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || 'https://mainnet.base.org');

  try {
    // Test basic contract connection
    console.log('\n🔍 Testing contract connection...');
    const code = await provider.getCode(PIZZA_PARTY_CORE_ADDRESS);
    console.log(`Contract code length: ${code.length} bytes`);
    
    if (code === '0x') {
      console.log('❌ No contract found at this address');
      return;
    }

    // Test with minimal ABI first
    const minimalContract = new ethers.Contract(
      PIZZA_PARTY_CORE_ADDRESS,
      [
        'function getCurrentGameId() view returns (uint256)',
        'function currentDailyJackpot() view returns (uint256)',
        'function getWeeklyJackpot() view returns (uint256)',
        'function getWeeklyToppingsPool() view returns (uint256)',
        'function getTotalToppingsClaimed() view returns (uint256)',
        'function getPlayerToppings(address) view returns (uint256)',
        'function getPlayerReferralInfo(address) view returns (uint256, address)',
        'function getPlayerVMFBalance(address) view returns (uint256)',
        'function getMinimumVMFRequired() view returns (uint256)'
      ],
      provider
    );

    console.log('\n🧪 Testing basic functions:');
    
    try {
      const gameId = await minimalContract.getCurrentGameId();
      console.log(`✅ getCurrentGameId(): ${gameId.toString()}`);
    } catch (error) {
      console.log(`❌ getCurrentGameId(): ${error.message}`);
    }

    try {
      const dailyJackpot = await minimalContract.currentDailyJackpot();
      console.log(`✅ currentDailyJackpot(): ${dailyJackpot.toString()}`);
    } catch (error) {
      console.log(`❌ currentDailyJackpot(): ${error.message}`);
    }

    try {
      const weeklyJackpot = await minimalContract.getWeeklyJackpot();
      console.log(`✅ getWeeklyJackpot(): ${weeklyJackpot.toString()}`);
    } catch (error) {
      console.log(`❌ getWeeklyJackpot(): ${error.message}`);
    }

    try {
      const toppingsPool = await minimalContract.getWeeklyToppingsPool();
      console.log(`✅ getWeeklyToppingsPool(): ${toppingsPool.toString()}`);
    } catch (error) {
      console.log(`❌ getWeeklyToppingsPool(): ${error.message}`);
    }

    try {
      const totalToppings = await minimalContract.getTotalToppingsClaimed();
      console.log(`✅ getTotalToppingsClaimed(): ${totalToppings.toString()}`);
    } catch (error) {
      console.log(`❌ getTotalToppingsClaimed(): ${error.message}`);
    }

    try {
      const minVmf = await minimalContract.getMinimumVMFRequired();
      console.log(`✅ getMinimumVMFRequired(): ${minVmf.toString()}`);
    } catch (error) {
      console.log(`❌ getMinimumVMFRequired(): ${error.message}`);
    }

    // Test with a valid checksum address
    const testAddress = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6";
    const checksumAddress = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6";
    
    try {
      const playerToppings = await minimalContract.getPlayerToppings(checksumAddress);
      console.log(`✅ getPlayerToppings(${checksumAddress}): ${playerToppings.toString()}`);
    } catch (error) {
      console.log(`❌ getPlayerToppings(${checksumAddress}): ${error.message}`);
    }

    try {
      const referralInfo = await minimalContract.getPlayerReferralInfo(checksumAddress);
      console.log(`✅ getPlayerReferralInfo(${checksumAddress}): ${referralInfo[0].toString()}, ${referralInfo[1]}`);
    } catch (error) {
      console.log(`❌ getPlayerReferralInfo(${checksumAddress}): ${error.message}`);
    }

    try {
      const vmfBalance = await minimalContract.getPlayerVMFBalance(checksumAddress);
      console.log(`✅ getPlayerVMFBalance(${checksumAddress}): ${vmfBalance.toString()}`);
    } catch (error) {
      console.log(`❌ getPlayerVMFBalance(${checksumAddress}): ${error.message}`);
    }

    console.log('\n🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Error testing contract:', error);
  }
}

// Run if called directly
if (require.main === module) {
  testNewContract()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testNewContract };
