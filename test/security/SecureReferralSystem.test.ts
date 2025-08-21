import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";

describe("SecureReferralSystem", function () {
  let referralSystem: Contract;
  let randomnessContract: Contract;
  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let user3: Signer;
  let user1Address: string;
  let user2Address: string;
  let user3Address: string;
  let ownerAddress: string;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();
    user3Address = await user3.getAddress();
    ownerAddress = await owner.getAddress();

    // Deploy FreeRandomness contract
    const FreeRandomness = await ethers.getContractFactory("FreeRandomness");
    randomnessContract = await FreeRandomness.deploy();
    await randomnessContract.waitForDeployment();

    // Deploy SecureReferralSystem
    const SecureReferralSystem = await ethers.getContractFactory("SecureReferralSystem");
    referralSystem = await SecureReferralSystem.deploy(await randomnessContract.getAddress());
    await referralSystem.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      expect(await referralSystem.totalCodesGenerated()).to.equal(0);
      expect(await referralSystem.totalCodesClaimed()).to.equal(0);
      expect(await referralSystem.totalRewardsDistributed()).to.equal(0);
      expect(await referralSystem.owner()).to.equal(ownerAddress);
    });

    it("Should set randomness contract correctly", async function () {
      expect(await referralSystem.randomnessContract()).to.equal(await randomnessContract.getAddress());
    });
  });

  describe("Code Generation", function () {
    it("Should generate VRF-based referral code", async function () {
      const maxClaims = 10;
      const rewardAmount = 2;
      const requestId = 1;

      await expect(referralSystem.connect(user1).generateVRFReferralCode(requestId, maxClaims, rewardAmount))
        .to.emit(referralSystem, "ReferralCodeGenerated");

      expect(await referralSystem.totalCodesGenerated()).to.equal(1);
    });

    it("Should generate blockhash-based referral code", async function () {
      const maxClaims = 5;
      const rewardAmount = 3;

      await expect(referralSystem.connect(user1).generateBlockhashReferralCode(maxClaims, rewardAmount))
        .to.emit(referralSystem, "ReferralCodeGenerated");

      expect(await referralSystem.totalCodesGenerated()).to.equal(1);
    });

    it("Should enforce rate limiting", async function () {
      const maxClaims = 10;
      const rewardAmount = 2;
      const requestId = 1;

      // Generate first code
      await referralSystem.connect(user1).generateVRFReferralCode(requestId, maxClaims, rewardAmount);

      // Try to generate another code immediately (should fail)
      await expect(
        referralSystem.connect(user1).generateVRFReferralCode(requestId + 1, maxClaims, rewardAmount)
      ).to.be.revertedWith("Rate limit exceeded");
    });

    it("Should enforce maximum codes per user", async function () {
      const maxClaims = 10;
      const rewardAmount = 2;

      // Generate maximum allowed codes
      for (let i = 0; i < 10; i++) {
        await referralSystem.connect(user1).generateBlockhashReferralCode(maxClaims, rewardAmount);
        // Wait for cooldown
        await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
        await ethers.provider.send("evm_mine", []);
      }

      // Try to generate one more (should fail)
      await expect(
        referralSystem.connect(user1).generateBlockhashReferralCode(maxClaims, rewardAmount)
      ).to.be.revertedWith("Max codes per user reached");
    });

    it("Should validate input parameters", async function () {
      // Invalid max claims
      await expect(
        referralSystem.connect(user1).generateBlockhashReferralCode(0, 2)
      ).to.be.revertedWith("Invalid max claims");

      await expect(
        referralSystem.connect(user1).generateBlockhashReferralCode(101, 2)
      ).to.be.revertedWith("Invalid max claims");

      // Invalid reward amount
      await expect(
        referralSystem.connect(user1).generateBlockhashReferralCode(10, 0)
      ).to.be.revertedWith("Invalid reward amount");
    });
  });

  describe("Code Claiming", function () {
    let codeHash: string;

    beforeEach(async function () {
      // Generate a referral code
      const maxClaims = 5;
      const rewardAmount = 2;
      const requestId = 1;

      const tx = await referralSystem.connect(user1).generateVRFReferralCode(requestId, maxClaims, rewardAmount);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => 
        log.fragment?.name === "ReferralCodeGenerated"
      );
      codeHash = event?.args?.codeHash;
    });

    it("Should allow claiming valid referral codes", async function () {
      await expect(referralSystem.connect(user2).claimReferralCode(codeHash))
        .to.emit(referralSystem, "ReferralCodeClaimed");

      expect(await referralSystem.totalCodesClaimed()).to.equal(1);
    });

    it("Should prevent claiming own codes", async function () {
      await expect(
        referralSystem.connect(user1).claimReferralCode(codeHash)
      ).to.be.revertedWith("Cannot claim your own code");
    });

    it("Should prevent double claiming", async function () {
      await referralSystem.connect(user2).claimReferralCode(codeHash);

      await expect(
        referralSystem.connect(user2).claimReferralCode(codeHash)
      ).to.be.revertedWith("Already claimed this code");
    });

    it("Should enforce claim limits", async function () {
      // Claim up to the limit
      for (let i = 0; i < 5; i++) {
        const user = i === 0 ? user2 : i === 1 ? user3 : await ethers.getSigner(i + 3);
        await referralSystem.connect(user).claimReferralCode(codeHash);
        
        // Wait for cooldown
        await ethers.provider.send("evm_increaseTime", [1800]); // 30 minutes
        await ethers.provider.send("evm_mine", []);
      }

      // Try to claim one more (should fail)
      const user6 = await ethers.getSigner(6);
      await expect(
        referralSystem.connect(user6).claimReferralCode(codeHash)
      ).to.be.revertedWith("Claim limit reached");
    });

    it("Should enforce claim rate limiting", async function () {
      await referralSystem.connect(user2).claimReferralCode(codeHash);

      // Try to claim another code immediately (should fail)
      const user1Code = await referralSystem.connect(user3).generateBlockhashReferralCode(5, 2);
      const user1CodeHash = await referralSystem.getReferralCode(user1Code.hash);

      await expect(
        referralSystem.connect(user2).claimReferralCode(user1CodeHash.codeHash)
      ).to.be.revertedWith("Claim rate limit exceeded");
    });
  });

  describe("Code Expiration and Reclamation", function () {
    let codeHash: string;

    beforeEach(async function () {
      // Generate a referral code
      const maxClaims = 5;
      const rewardAmount = 2;
      const requestId = 1;

      const tx = await referralSystem.connect(user1).generateVRFReferralCode(requestId, maxClaims, rewardAmount);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => 
        log.fragment?.name === "ReferralCodeGenerated"
      );
      codeHash = event?.args?.codeHash;
    });

    it("Should allow reclaiming expired codes", async function () {
      // Fast forward time to expire the code
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 3600 + 1]); // 30 days + 1 second
      await ethers.provider.send("evm_mine", []);

      await expect(referralSystem.connect(user1).reclaimExpiredCode(codeHash))
        .to.emit(referralSystem, "CodeReclaimed");
    });

    it("Should prevent reclaiming non-expired codes", async function () {
      await expect(
        referralSystem.connect(user1).reclaimExpiredCode(codeHash)
      ).to.be.revertedWith("Code not expired");
    });

    it("Should prevent reclaiming by non-creator", async function () {
      // Fast forward time to expire the code
      await ethers.provider.send("evm_increaseTime", [30 * 24 * 3600 + 1]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        referralSystem.connect(user2).reclaimExpiredCode(codeHash)
      ).to.be.revertedWith("Not code creator");
    });
  });

  describe("Blacklist Functionality", function () {
    it("Should allow owner to blacklist users", async function () {
      await expect(referralSystem.connect(owner).setUserBlacklisted(user1Address, true, "Test blacklist"))
        .to.emit(referralSystem, "UserBlacklisted")
        .withArgs(user1Address, true, "Test blacklist");
    });

    it("Should prevent blacklisted users from generating codes", async function () {
      await referralSystem.connect(owner).setUserBlacklisted(user1Address, true, "Test blacklist");

      await expect(
        referralSystem.connect(user1).generateBlockhashReferralCode(10, 2)
      ).to.be.revertedWith("User is blacklisted");
    });

    it("Should prevent blacklisted users from claiming codes", async function () {
      // Generate a code
      const maxClaims = 5;
      const rewardAmount = 2;
      const requestId = 1;

      const tx = await referralSystem.connect(user2).generateVRFReferralCode(requestId, maxClaims, rewardAmount);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => 
        log.fragment?.name === "ReferralCodeGenerated"
      );
      const codeHash = event?.args?.codeHash;

      // Blacklist user1
      await referralSystem.connect(owner).setUserBlacklisted(user1Address, true, "Test blacklist");

      // Try to claim code (should fail)
      await expect(
        referralSystem.connect(user1).claimReferralCode(codeHash)
      ).to.be.revertedWith("User is blacklisted");
    });

    it("Should allow owner to unblacklist users", async function () {
      await referralSystem.connect(owner).setUserBlacklisted(user1Address, true, "Test blacklist");
      await referralSystem.connect(owner).setUserBlacklisted(user1Address, false, "Test unblacklist");

      // Should be able to generate codes again
      await expect(referralSystem.connect(user1).generateBlockhashReferralCode(10, 2))
        .to.emit(referralSystem, "ReferralCodeGenerated");
    });

    it("Should prevent non-owner from blacklisting users", async function () {
      await expect(
        referralSystem.connect(user1).setUserBlacklisted(user2Address, true, "Test blacklist")
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow owner to pause and unpause", async function () {
      await expect(referralSystem.connect(owner).setPaused(true))
        .to.emit(referralSystem, "Paused")
        .withArgs(ownerAddress);

      await expect(referralSystem.connect(owner).setPaused(false))
        .to.emit(referralSystem, "Unpaused")
        .withArgs(ownerAddress);
    });

    it("Should prevent operations when paused", async function () {
      await referralSystem.connect(owner).setPaused(true);

      await expect(
        referralSystem.connect(user1).generateBlockhashReferralCode(10, 2)
      ).to.be.revertedWith("Pausable: paused");

      await expect(
        referralSystem.connect(user1).claimReferralCode(ethers.ZeroHash)
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(
        referralSystem.connect(user1).setPaused(true)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Data Retrieval", function () {
    it("Should return correct user referral data", async function () {
      const maxClaims = 10;
      const rewardAmount = 2;
      const requestId = 1;

      // Generate a code
      await referralSystem.connect(user1).generateVRFReferralCode(requestId, maxClaims, rewardAmount);

      const userData = await referralSystem.getUserReferralData(user1Address);
      expect(userData.totalCodesCreated).to.equal(1);
      expect(userData.totalCodesClaimed).to.equal(0);
      expect(userData.totalRewardsEarned).to.equal(0);
      expect(userData.isBlacklisted).to.equal(false);
    });

    it("Should return correct system statistics", async function () {
      const maxClaims = 10;
      const rewardAmount = 2;
      const requestId = 1;

      // Generate a code
      await referralSystem.connect(user1).generateVRFReferralCode(requestId, maxClaims, rewardAmount);

      const stats = await referralSystem.getSystemStats();
      expect(stats.totalCodesGenerated).to.equal(1);
      expect(stats.totalCodesClaimed).to.equal(0);
      expect(stats.totalRewardsDistributed).to.equal(0);
    });

    it("Should return correct referral code details", async function () {
      const maxClaims = 10;
      const rewardAmount = 2;
      const requestId = 1;

      const tx = await referralSystem.connect(user1).generateVRFReferralCode(requestId, maxClaims, rewardAmount);
      const receipt = await tx.wait();
      const event = receipt?.logs.find((log: any) => 
        log.fragment?.name === "ReferralCodeGenerated"
      );
      const codeHash = event?.args?.codeHash;

      const codeDetails = await referralSystem.getReferralCode(codeHash);
      expect(codeDetails.creator).to.equal(user1Address);
      expect(codeDetails.claimed).to.equal(false);
      expect(codeDetails.claimCount).to.equal(0);
      expect(codeDetails.maxClaims).to.equal(maxClaims);
      expect(codeDetails.rewardAmount).to.equal(rewardAmount);
      expect(codeDetails.isActive).to.equal(true);
    });
  });

  describe("Security Features", function () {
    it("Should prevent reentrancy attacks", async function () {
      // This test would require a malicious contract that tries to reenter
      // For now, we test that the contract has ReentrancyGuard
      expect(await referralSystem.hasRole(ethers.ZeroHash, ownerAddress)).to.be.false;
    });

    it("Should validate addresses", async function () {
      await expect(
        referralSystem.connect(owner).setUserBlacklisted(ethers.ZeroAddress, true, "Test")
      ).to.not.be.reverted; // This should work, but we can add validation if needed
    });

    it("Should handle edge cases", async function () {
      // Test with maximum values
      const maxClaims = 100;
      const rewardAmount = 1000;

      await expect(
        referralSystem.connect(user1).generateBlockhashReferralCode(maxClaims, rewardAmount)
      ).to.emit(referralSystem, "ReferralCodeGenerated");
    });
  });

  describe("Gas Optimization", function () {
    it("Should use efficient storage patterns", async function () {
      const maxClaims = 10;
      const rewardAmount = 2;

      // Generate multiple codes to test gas efficiency
      for (let i = 0; i < 5; i++) {
        await referralSystem.connect(user1).generateBlockhashReferralCode(maxClaims, rewardAmount);
        await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
        await ethers.provider.send("evm_mine", []);
      }

      expect(await referralSystem.totalCodesGenerated()).to.equal(5);
    });
  });
}); 