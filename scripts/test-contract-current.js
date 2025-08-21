require('dotenv').config();
const { ethers } = require('ethers');

async function testCurrentContract() {
  console.log('🧪 Testing Current Contract Functions');
  
  const PIZZA_PARTY_CORE_ADDRESS = "0x705C974B290db3421ED749cd5838b982bB9B6c51";
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
        'function currentWeeklyJackpot() view returns (uint256)',
        'function getWeeklyJackpot() view returns (uint256)',
        'function getWeeklyToppingsPool() view returns (uint256)',
        'function totalToppingsClaimed() view returns (uint256)',
        'function getPlayerToppings(address) view returns (uint256)',
        'function getPlayerReferralInfo(address) view returns (uint256, address)',
        'function getPlayerVMFBalance(address) view returns (uint256)'
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
      const weeklyJackpot = await minimalContract.currentWeeklyJackpot();
      console.log(`✅ currentWeeklyJackpot(): ${weeklyJackpot.toString()}`);
    } catch (error) {
      console.log(`❌ currentWeeklyJackpot(): ${error.message}`);
    }

    try {
      const weeklyJackpotNew = await minimalContract.getWeeklyJackpot();
      console.log(`✅ getWeeklyJackpot(): ${weeklyJackpotNew.toString()}`);
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
      const totalToppings = await minimalContract.totalToppingsClaimed();
      console.log(`✅ totalToppingsClaimed(): ${totalToppings.toString()}`);
    } catch (error) {
      console.log(`❌ totalToppingsClaimed(): ${error.message}`);
    }

    // Test with a sample wallet address
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

    // Test with the full ABI from contract-config
    console.log('\n🧪 Testing with full ABI...');
    
    try {
      const { PIZZA_PARTY_CORE_ABI } = require('../lib/contract-config');
      const fullContract = new ethers.Contract(
        PIZZA_PARTY_CORE_ADDRESS,
        PIZZA_PARTY_CORE_ABI,
        provider
      );

      try {
        const weeklyJackpotFull = await fullContract.getWeeklyJackpot();
        console.log(`✅ getWeeklyJackpot() (full ABI): ${weeklyJackpotFull.toString()}`);
      } catch (error) {
        console.log(`❌ getWeeklyJackpot() (full ABI): ${error.message}`);
      }
    } catch (error) {
      console.log(`❌ Error loading full ABI: ${error.message}`);
    }

    // Check if this is the old contract by testing old functions
    console.log('\n🧪 Testing for old contract functions...');
    
    try {
      const oldContract = new ethers.Contract(
        PIZZA_PARTY_CORE_ADDRESS,
        [
          'function getCurrentEntryFee() view returns (uint256)',
          'function getVMFPrice() view returns (uint256)',
          'function getDailyJackpot() view returns (uint256)',
          'function getWeeklyJackpot() view returns (uint256)'
        ],
        provider
      );

      try {
        const entryFee = await oldContract.getCurrentEntryFee();
        console.log(`✅ getCurrentEntryFee(): ${entryFee.toString()}`);
      } catch (error) {
        console.log(`❌ getCurrentEntryFee(): ${error.message}`);
      }

      try {
        const vmfPrice = await oldContract.getVMFPrice();
        console.log(`✅ getVMFPrice(): ${vmfPrice.toString()}`);
      } catch (error) {
        console.log(`❌ getVMFPrice(): ${error.message}`);
      }

      try {
        const dailyJackpotOld = await oldContract.getDailyJackpot();
        console.log(`✅ getDailyJackpot(): ${dailyJackpotOld.toString()}`);
      } catch (error) {
        console.log(`❌ getDailyJackpot(): ${error.message}`);
      }

      try {
        const weeklyJackpotOld = await oldContract.getWeeklyJackpot();
        console.log(`✅ getWeeklyJackpot() (old): ${weeklyJackpotOld.toString()}`);
      } catch (error) {
        console.log(`❌ getWeeklyJackpot() (old): ${error.message}`);
      }

    } catch (error) {
      console.log(`❌ Error testing old contract: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error testing contract:', error);
  }
}

// Run if called directly
if (require.main === module) {
  testCurrentContract()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testCurrentContract };
