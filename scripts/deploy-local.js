const { ethers } = require("hardhat");

async function main() {
  console.log("🍕 Testing deployment locally...");

  // Get the signer
  const [deployer] = await ethers.getSigners();
  console.log("👤 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // Test deployment of FreeRandomness
  console.log("🎲 Deploying FreeRandomness contract...");
  const FreeRandomness = await ethers.getContractFactory("FreeRandomness");
  const randomnessContract = await FreeRandomness.deploy();
  await randomnessContract.waitForDeployment();
  const randomnessAddress = await randomnessContract.getAddress();
  console.log("✅ FreeRandomness deployed at:", randomnessAddress);

  // Test deployment of FreePriceOracle
  console.log("📊 Deploying FreePriceOracle contract...");
  const FreePriceOracle = await ethers.getContractFactory("FreePriceOracle");
  const priceOracle = await FreePriceOracle.deploy();
  await priceOracle.waitForDeployment();
  const priceOracleAddress = await priceOracle.getAddress();
  console.log("✅ FreePriceOracle deployed at:", priceOracleAddress);

  // Test deployment of PizzaParty with mock VMF address
  console.log("🍕 Deploying PizzaParty contract...");
  const PizzaParty = await ethers.getContractFactory("PizzaParty");
  const mockVMFAddress = "0x0000000000000000000000000000000000000000"; // Mock address for testing
  const pizzaParty = await PizzaParty.deploy(
    mockVMFAddress,
    randomnessAddress,
    priceOracleAddress
  );

  await pizzaParty.waitForDeployment();
  const contractAddress = await pizzaParty.getAddress();

  console.log("✅ PizzaParty deployed successfully!");
  console.log("📄 Contract Address:", contractAddress);
  console.log("🎲 FreeRandomness:", randomnessAddress);
  console.log("📊 FreePriceOracle:", priceOracleAddress);
  console.log("🌐 Network: Local Hardhat Node");
  console.log("🍕 Local deployment test successful!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 