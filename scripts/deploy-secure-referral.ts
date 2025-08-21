import { ethers } from "hardhat";
import { verify } from "./verify";

async function main() {
  console.log("🚀 Deploying Secure Referral System...");

  // Get the contract factory
  const SecureReferralSystem = await ethers.getContractFactory("SecureReferralSystem");

  // Deploy FreeRandomness first (if not already deployed)
  const FreeRandomness = await ethers.getContractFactory("FreeRandomness");
  const randomnessContract = await FreeRandomness.deploy();
  await randomnessContract.waitForDeployment();
  const randomnessAddress = await randomnessContract.getAddress();
  console.log("✅ FreeRandomness deployed to:", randomnessAddress);

  // Deploy SecureReferralSystem
  const referralSystem = await SecureReferralSystem.deploy(randomnessAddress);
  await referralSystem.waitForDeployment();
  const referralSystemAddress = await referralSystem.getAddress();

  console.log("✅ SecureReferralSystem deployed to:", referralSystemAddress);

  // Verify contracts on Basescan
  console.log("🔍 Verifying contracts on Basescan...");
  
  try {
    await verify(randomnessAddress, []);
    console.log("✅ FreeRandomness verified on Basescan");
  } catch (error) {
    console.log("⚠️ FreeRandomness verification failed:", error);
  }

  try {
    await verify(referralSystemAddress, [randomnessAddress]);
    console.log("✅ SecureReferralSystem verified on Basescan");
  } catch (error) {
    console.log("⚠️ SecureReferralSystem verification failed:", error);
  }

  console.log("\n📋 Deployment Summary:");
  console.log("================================");
  console.log("FreeRandomness:", randomnessAddress);
  console.log("SecureReferralSystem:", referralSystemAddress);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Deployer:", (await ethers.getSigners())[0].address);
  console.log("================================");

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    deployer: (await ethers.getSigners())[0].address,
    contracts: {
      FreeRandomness: randomnessAddress,
      SecureReferralSystem: referralSystemAddress
    },
    timestamp: new Date().toISOString()
  };

  console.log("\n💾 Deployment info saved to deployment-secure-referral.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }); 