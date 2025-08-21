require('dotenv').config();
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Deploying Advanced Pizza Party Contracts...\n");
    
    // Get deployer
    const [deployer] = await ethers.getSigners();
    console.log(`📝 Deploying contracts with account: ${deployer.address}`);
    console.log(`💰 Account balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`);
    
    // Contract addresses from previous deployment
    const VMF_TOKEN_ADDRESS = "0x2213414893259b0C48066Acd1763e7fbA97859E5";
    const FREE_PRICE_ORACLE_ADDRESS = "0xAA43fE819C0103fE820c04259929b3f344AfBfa3"; // From previous deployment
    
    const deploymentResults = {
        deploymentTime: new Date().toISOString(),
        network: "base",
        deployer: deployer.address,
        contracts: {}
    };
    
    // Helper function to delay between deployments
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    try {
        // 1. Deploy PizzaPartyReferral
        console.log("🔗 Deploying PizzaPartyReferral...");
        const PizzaPartyReferral = await ethers.getContractFactory("PizzaPartyReferral");
        const pizzaPartyReferral = await PizzaPartyReferral.deploy(VMF_TOKEN_ADDRESS);
        await pizzaPartyReferral.waitForDeployment();
        const referralAddress = await pizzaPartyReferral.getAddress();
        console.log(`✅ PizzaPartyReferral deployed to: ${referralAddress}`);
        deploymentResults.contracts.PizzaPartyReferral = referralAddress;
        
        await delay(3000);
        
        // 2. Deploy PizzaPartyDynamicPricing
        console.log("💰 Deploying PizzaPartyDynamicPricing...");
        const PizzaPartyDynamicPricing = await ethers.getContractFactory("PizzaPartyDynamicPricing");
        const pizzaPartyDynamicPricing = await PizzaPartyDynamicPricing.deploy(VMF_TOKEN_ADDRESS, FREE_PRICE_ORACLE_ADDRESS);
        await pizzaPartyDynamicPricing.waitForDeployment();
        const dynamicPricingAddress = await pizzaPartyDynamicPricing.getAddress();
        console.log(`✅ PizzaPartyDynamicPricing deployed to: ${dynamicPricingAddress}`);
        deploymentResults.contracts.PizzaPartyDynamicPricing = dynamicPricingAddress;
        
        await delay(3000);
        
        // 3. Deploy PizzaPartyLoyalty
        console.log("🏆 Deploying PizzaPartyLoyalty...");
        const PizzaPartyLoyalty = await ethers.getContractFactory("PizzaPartyLoyalty");
        const pizzaPartyLoyalty = await PizzaPartyLoyalty.deploy(VMF_TOKEN_ADDRESS);
        await pizzaPartyLoyalty.waitForDeployment();
        const loyaltyAddress = await pizzaPartyLoyalty.getAddress();
        console.log(`✅ PizzaPartyLoyalty deployed to: ${loyaltyAddress}`);
        deploymentResults.contracts.PizzaPartyLoyalty = loyaltyAddress;
        
        await delay(3000);
        
        // 4. Deploy PizzaPartyAdvancedRandomness
        console.log("🎲 Deploying PizzaPartyAdvancedRandomness...");
        const PizzaPartyAdvancedRandomness = await ethers.getContractFactory("PizzaPartyAdvancedRandomness");
        const pizzaPartyAdvancedRandomness = await PizzaPartyAdvancedRandomness.deploy();
        await pizzaPartyAdvancedRandomness.waitForDeployment();
        const advancedRandomnessAddress = await pizzaPartyAdvancedRandomness.getAddress();
        console.log(`✅ PizzaPartyAdvancedRandomness deployed to: ${advancedRandomnessAddress}`);
        deploymentResults.contracts.PizzaPartyAdvancedRandomness = advancedRandomnessAddress;
        
        await delay(3000);
        
        // 5. Deploy PizzaPartyAnalytics
        console.log("📊 Deploying PizzaPartyAnalytics...");
        const PizzaPartyAnalytics = await ethers.getContractFactory("PizzaPartyAnalytics");
        const pizzaPartyAnalytics = await PizzaPartyAnalytics.deploy(VMF_TOKEN_ADDRESS);
        await pizzaPartyAnalytics.waitForDeployment();
        const analyticsAddress = await pizzaPartyAnalytics.getAddress();
        console.log(`✅ PizzaPartyAnalytics deployed to: ${analyticsAddress}`);
        deploymentResults.contracts.PizzaPartyAnalytics = analyticsAddress;
        
        await delay(3000);
        
        // 6. Deploy PizzaPartyWeeklyChallenges
        console.log("🎯 Deploying PizzaPartyWeeklyChallenges...");
        const PizzaPartyWeeklyChallenges = await ethers.getContractFactory("PizzaPartyWeeklyChallenges");
        const pizzaPartyWeeklyChallenges = await PizzaPartyWeeklyChallenges.deploy(VMF_TOKEN_ADDRESS);
        await pizzaPartyWeeklyChallenges.waitForDeployment();
        const weeklyChallengesAddress = await pizzaPartyWeeklyChallenges.getAddress();
        console.log(`✅ PizzaPartyWeeklyChallenges deployed to: ${weeklyChallengesAddress}`);
        deploymentResults.contracts.PizzaPartyWeeklyChallenges = weeklyChallengesAddress;
        
        // Verify contracts on BaseScan
        console.log("\n🔍 Verifying contracts on BaseScan...");
        
        try {
            await hre.run("verify:verify", {
                address: referralAddress,
                constructorArguments: [VMF_TOKEN_ADDRESS],
            });
            console.log("✅ PizzaPartyReferral verified");
        } catch (error) {
            console.log("❌ PizzaPartyReferral verification failed:", error.message);
        }
        
        try {
            await hre.run("verify:verify", {
                address: dynamicPricingAddress,
                constructorArguments: [VMF_TOKEN_ADDRESS, FREE_PRICE_ORACLE_ADDRESS],
            });
            console.log("✅ PizzaPartyDynamicPricing verified");
        } catch (error) {
            console.log("❌ PizzaPartyDynamicPricing verification failed:", error.message);
        }
        
        try {
            await hre.run("verify:verify", {
                address: loyaltyAddress,
                constructorArguments: [VMF_TOKEN_ADDRESS],
            });
            console.log("✅ PizzaPartyLoyalty verified");
        } catch (error) {
            console.log("❌ PizzaPartyLoyalty verification failed:", error.message);
        }
        
        try {
            await hre.run("verify:verify", {
                address: advancedRandomnessAddress,
                constructorArguments: [],
            });
            console.log("✅ PizzaPartyAdvancedRandomness verified");
        } catch (error) {
            console.log("❌ PizzaPartyAdvancedRandomness verification failed:", error.message);
        }
        
        try {
            await hre.run("verify:verify", {
                address: analyticsAddress,
                constructorArguments: [VMF_TOKEN_ADDRESS],
            });
            console.log("✅ PizzaPartyAnalytics verified");
        } catch (error) {
            console.log("❌ PizzaPartyAnalytics verification failed:", error.message);
        }
        
        try {
            await hre.run("verify:verify", {
                address: weeklyChallengesAddress,
                constructorArguments: [VMF_TOKEN_ADDRESS],
            });
            console.log("✅ PizzaPartyWeeklyChallenges verified");
        } catch (error) {
            console.log("❌ PizzaPartyWeeklyChallenges verification failed:", error.message);
        }
        
        // Save deployment results
        const fs = require('fs');
        fs.writeFileSync(
            'advanced-contracts-deployment.json',
            JSON.stringify(deploymentResults, null, 2)
        );
        
        console.log("\n🎉 ADVANCED CONTRACTS DEPLOYMENT COMPLETE!");
        console.log("📄 Deployment results saved to: advanced-contracts-deployment.json");
        
        console.log("\n📋 DEPLOYMENT SUMMARY:");
        console.log("=".repeat(50));
        console.log(`🔗 Referral System: ${referralAddress}`);
        console.log(`💰 Dynamic Pricing: ${dynamicPricingAddress}`);
        console.log(`🏆 Loyalty Points: ${loyaltyAddress}`);
        console.log(`🎲 Advanced Randomness: ${advancedRandomnessAddress}`);
        console.log(`📊 Analytics: ${analyticsAddress}`);
        console.log(`🎯 Weekly Challenges: ${weeklyChallengesAddress}`);
        console.log("=".repeat(50));
        
        console.log("\n🚀 NEXT STEPS:");
        console.log("1. Update your frontend to integrate with these new contracts");
        console.log("2. Configure contract interactions in your game logic");
        console.log("3. Test all advanced features with the new modular system");
        console.log("4. Monitor gas usage and optimize as needed");
        
    } catch (error) {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
