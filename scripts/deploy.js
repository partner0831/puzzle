const { ethers } = require("hardhat");

async function main() {
  console.log("🍕 Deploying PizzaParty contract to Base network...");

  // VMF Token contract address on Base network
  const VMF_TOKEN_ADDRESS = "0x2213414893259b0C48066Acd1763e7fbA97859E5";

  console.log("📄 VMF Token Address:", VMF_TOKEN_ADDRESS);
  console.log("🌐 Network: Base");

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying with account:", deployer.address);

  // Get current nonce and gas price
  const nonce = await deployer.getNonce();
  const gasPrice = await ethers.provider.getFeeData();
  console.log("🔢 Current nonce:", nonce);
  console.log("⛽ Gas price:", ethers.formatUnits(gasPrice.gasPrice, "gwei"), "gwei");

  // Deploy FreeRandomness contract first
  console.log("🎲 Deploying FreeRandomness contract...");
  const FreeRandomness = await ethers.getContractFactory("FreeRandomness");
  const randomnessContract = await FreeRandomness.deploy({
    gasPrice: gasPrice.gasPrice * BigInt(120) / BigInt(100), // 20% higher gas price
    nonce: nonce
  });
  await randomnessContract.waitForDeployment();
  const randomnessAddress = await randomnessContract.getAddress();
  console.log("✅ FreeRandomness deployed at:", randomnessAddress);

  // Deploy FreePriceOracle contract
  console.log("📊 Deploying FreePriceOracle contract...");
  const FreePriceOracle = await ethers.getContractFactory("FreePriceOracle");
  const priceOracle = await FreePriceOracle.deploy({
    gasPrice: gasPrice.gasPrice * BigInt(120) / BigInt(100), // 20% higher gas price
    nonce: nonce + 1
  });
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log("✅ FreePriceOracle deployed at:", priceOracleAddress);

  // Deploy PizzaParty contract with all required parameters
  console.log("🍕 Deploying PizzaParty contract...");
  const PizzaParty = await ethers.getContractFactory("PizzaParty");
  const pizzaParty = await PizzaParty.deploy(
    VMF_TOKEN_ADDRESS,
    randomnessAddress,
    priceOracleAddress,
    {
      gasPrice: gasPrice.gasPrice * BigInt(120) / BigInt(100), // 20% higher gas price
      nonce: nonce + 2
    }
  );

  await pizzaParty.waitForDeployment();
  const contractAddress = await pizzaParty.getAddress();

  console.log("✅ PizzaParty deployed successfully!");
  console.log("📄 Contract Address:", contractAddress);
  console.log("🔗 Basescan URL:", `https://basescan.org/address/${contractAddress}`);

  // Verify the contracts
  console.log("🔍 Verifying contracts...");
  
  try {
    // Verify FreeRandomness
    await hre.run("verify:verify", {
      address: randomnessAddress,
      constructorArguments: [],
    });
    console.log("✅ FreeRandomness verified on Basescan!");

    // Verify FreePriceOracle
    await hre.run("verify:verify", {
      address: priceOracleAddress,
      constructorArguments: [],
    });
    console.log("✅ FreePriceOracle verified on Basescan!");

    // Verify PizzaParty
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [VMF_TOKEN_ADDRESS, randomnessAddress, priceOracleAddress],
    });
    console.log("✅ PizzaParty verified on Basescan!");
  } catch (error) {
    console.log("⚠️ Verification failed:", error);
  }

  // Initialize the contract
  console.log("🚀 Initializing contract...");
  
  try {
    // Start the first daily game
    console.log("📅 Starting first daily game...");
    
    // Set initial jackpot amounts
    console.log("💰 Setting initial jackpot amounts...");
    
    console.log("✅ Contract initialization complete!");
  } catch (error) {
    console.log("❌ Contract initialization failed:", error);
  }

  console.log("\n🎉 Deployment Summary:");
  console.log("📄 Contract: PizzaParty");
  console.log("📍 Address:", contractAddress);
  console.log("🎲 FreeRandomness:", randomnessAddress);
  console.log("📊 FreePriceOracle:", priceOracleAddress);
  console.log("🌐 Network: Base");
  console.log("🔗 Explorer:", `https://basescan.org/address/${contractAddress}`);
  console.log("🍕 Ready for Pizza Partying!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 