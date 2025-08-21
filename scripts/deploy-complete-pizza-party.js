require('dotenv').config();
const { ethers } = require('hardhat');

async function deployCompletePizzaParty() {
  console.log('🚀 Deploying Complete PizzaPartyCore Contract');
  console.log('🌐 Network:', network.name);
  console.log('👤 Deployer:', (await ethers.getSigners())[0].address);

  try {
    // Get the PizzaPartyCore contract factory
    const PizzaPartyCore = await ethers.getContractFactory('PizzaPartyCore');
    
    // VMF Token address
    const VMF_TOKEN_ADDRESS = "0x2213414893259b0C48066Acd1763e7fbA97859E5";
    
    console.log('\n📋 Deployment Parameters:');
    console.log('VMF Token Address:', VMF_TOKEN_ADDRESS);
    
    // Deploy the contract
    console.log('\n🔧 Deploying contract...');
    const pizzaPartyCore = await PizzaPartyCore.deploy(VMF_TOKEN_ADDRESS);
    
    console.log('⏳ Waiting for deployment confirmation...');
    await pizzaPartyCore.waitForDeployment();
    
    const contractAddress = await pizzaPartyCore.getAddress();
    console.log('✅ Contract deployed to:', contractAddress);
    
    // Verify deployment
    console.log('\n🔍 Verifying deployment...');
    const code = await ethers.provider.getCode(contractAddress);
    if (code === '0x') {
      throw new Error('Contract deployment failed - no code at address');
    }
    console.log('✅ Contract code verified');
    
    // Test basic functions
    console.log('\n🧪 Testing contract functions...');
    
    try {
      const gameId = await pizzaPartyCore.getCurrentGameId();
      console.log('✅ getCurrentGameId():', gameId.toString());
    } catch (error) {
      console.log('❌ getCurrentGameId():', error.message);
    }
    
    try {
      const dailyJackpot = await pizzaPartyCore.currentDailyJackpot();
      console.log('✅ currentDailyJackpot():', dailyJackpot.toString());
    } catch (error) {
      console.log('❌ currentDailyJackpot():', error.message);
    }
    
    try {
      const weeklyJackpot = await pizzaPartyCore.getWeeklyJackpot();
      console.log('✅ getWeeklyJackpot():', weeklyJackpot.toString());
    } catch (error) {
      console.log('❌ getWeeklyJackpot():', error.message);
    }
    
    try {
      const toppingsPool = await pizzaPartyCore.getWeeklyToppingsPool();
      console.log('✅ getWeeklyToppingsPool():', toppingsPool.toString());
    } catch (error) {
      console.log('❌ getWeeklyToppingsPool():', error.message);
    }
    
    try {
      const totalToppings = await pizzaPartyCore.getTotalToppingsClaimed();
      console.log('✅ getTotalToppingsClaimed():', totalToppings.toString());
    } catch (error) {
      console.log('❌ getTotalToppingsClaimed():', error.message);
    }
    
    try {
      const minVmf = await pizzaPartyCore.getMinimumVMFRequired();
      console.log('✅ getMinimumVMFRequired():', minVmf.toString());
    } catch (error) {
      console.log('❌ getMinimumVMFRequired():', error.message);
    }
    
    // Test with a sample address
    const testAddress = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6";
    
    try {
      const playerToppings = await pizzaPartyCore.getPlayerToppings(testAddress);
      console.log('✅ getPlayerToppings():', playerToppings.toString());
    } catch (error) {
      console.log('❌ getPlayerToppings():', error.message);
    }
    
    try {
      const referralInfo = await pizzaPartyCore.getPlayerReferralInfo(testAddress);
      console.log('✅ getPlayerReferralInfo():', referralInfo[0].toString(), referralInfo[1]);
    } catch (error) {
      console.log('❌ getPlayerReferralInfo():', error.message);
    }
    
    try {
      const vmfBalance = await pizzaPartyCore.getPlayerVMFBalance(testAddress);
      console.log('✅ getPlayerVMFBalance():', vmfBalance.toString());
    } catch (error) {
      console.log('❌ getPlayerVMFBalance():', error.message);
    }
    
    // Verify on BaseScan
    console.log('\n🔍 Verifying contract on BaseScan...');
    try {
      await hre.run('verify:verify', {
        address: contractAddress,
        constructorArguments: [VMF_TOKEN_ADDRESS],
      });
      console.log('✅ Contract verified on BaseScan');
    } catch (error) {
      console.log('⚠️ Verification failed (may already be verified):', error.message);
    }
    
    // Save deployment info
    const deploymentInfo = {
      deploymentTime: new Date().toISOString(),
      network: network.name,
      contract: 'PizzaPartyCore',
      address: contractAddress,
      vmfTokenAddress: VMF_TOKEN_ADDRESS,
      deployer: (await ethers.getSigners())[0].address,
      features: [
        'Complete topping system implementation',
        'Weekly jackpot calculation (toppings × 1 VMF)',
        'Daily play rewards (1 topping per day)',
        'Referral system (2 toppings per referral)',
        'VMF holdings rewards (3 toppings per 10 VMF)',
        'Player statistics tracking',
        'Blacklist functionality',
        'Emergency controls',
        'All required getter functions'
      ],
      constants: {
        dailyWinnersCount: "8",
        weeklyWinnersCount: "10",
        dailyPlayReward: "1 topping",
        referralReward: "2 toppings",
        vmfHoldingReward: "3 toppings per 10 VMF",
        vmfPerTopping: "1 VMF per topping",
        minVmfRequired: "100 VMF",
        maxDailyEntries: "10"
      },
      functions: [
        'getCurrentGameId()',
        'currentDailyJackpot()',
        'getWeeklyJackpot()',
        'getWeeklyToppingsPool()',
        'getTotalToppingsClaimed()',
        'getPlayerToppings(address)',
        'getPlayerReferralInfo(address)',
        'getPlayerVMFBalance(address)',
        'getMinimumVMFRequired()',
        'getPlayerInfo(address)'
      ]
    };
    
    const fs = require('fs');
    fs.writeFileSync(
      'complete-pizza-party-deployment.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log('\n📄 Deployment info saved to: complete-pizza-party-deployment.json');
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update lib/contract-config.ts with new address:', contractAddress);
    console.log('2. Test the frontend with the new contract');
    console.log('3. Update database configuration if needed');
    
    return {
      address: contractAddress,
      deploymentInfo
    };
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  deployCompletePizzaParty()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    });
}

module.exports = { deployCompletePizzaParty };
