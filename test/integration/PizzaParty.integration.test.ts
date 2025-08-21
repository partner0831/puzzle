import { expect } from "chai";
import { ethers } from "hardhat";
import { PizzaParty } from "../typechain-types";
import { SignerWithAddress } from "@ethersproject/contracts/node_modules/@ethersproject/abstract-signer";

describe("PizzaParty Integration Tests", function () {
  let pizzaParty: PizzaParty;
  let owner: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;
  let player3: SignerWithAddress;
  let vmfToken: any;

  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners();

    // Deploy mock VMF token
    const MockVMF = await ethers.getContractFactory("MockVMF");
    vmfToken = await MockVMF.deploy();
    await vmfToken.deployed();

    // Deploy PizzaParty contract
    const PizzaParty = await ethers.getContractFactory("PizzaParty");
    pizzaParty = await PizzaParty.deploy(vmfToken.address);
    await pizzaParty.deployed();

    // Setup initial balances
    await vmfToken.mint(player1.address, ethers.utils.parseEther("10"));
    await vmfToken.mint(player2.address, ethers.utils.parseEther("10"));
    await vmfToken.mint(player3.address, ethers.utils.parseEther("10"));
  });

  describe("Daily Game Integration", function () {
    it("Should allow multiple players to enter daily game", async function () {
      // Player 1 enters
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player1).enterDailyGame("");

      // Player 2 enters
      await vmfToken.connect(player2).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player2).enterDailyGame("");

      // Player 3 enters
      await vmfToken.connect(player3).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player3).enterDailyGame("");

      // Check game state
      const currentGame = await pizzaParty.getCurrentGame();
      expect(currentGame.totalEntries).to.equal(3);
    });

    it("Should handle referral codes correctly", async function () {
      // Player 1 creates referral code
      await pizzaParty.connect(player1).createReferralCode();

      // Player 2 uses Player 1's referral code
      await vmfToken.connect(player2).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player2).enterDailyGame("PLAYER1_REFERRAL_CODE");

      // Check that both players got toppings
      const player1Info = await pizzaParty.getPlayerInfo(player1.address);
      const player2Info = await pizzaParty.getPlayerInfo(player2.address);

      expect(player1Info.totalToppings).to.be.gt(0);
      expect(player2Info.totalToppings).to.be.gt(0);
    });

    it("Should award toppings for daily play", async function () {
      // Player enters daily game
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player1).enterDailyGame("");

      // Check toppings awarded
      const playerInfo = await pizzaParty.getPlayerInfo(player1.address);
      expect(playerInfo.totalToppings).to.be.gt(0);
    });

    it("Should prevent double entry on same day", async function () {
      // Player enters once
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("2"));
      await pizzaParty.connect(player1).enterDailyGame("");

      // Try to enter again
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.be.revertedWith("Already entered today");
    });
  });

  describe("Weekly Jackpot Integration", function () {
    it("Should track toppings for weekly jackpot", async function () {
      // Multiple players earn toppings
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player1).enterDailyGame("");

      await vmfToken.connect(player2).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player2).enterDailyGame("");

      // Award VMF holdings toppings
      await pizzaParty.connect(player1).awardVMFHoldingsToppings();
      await pizzaParty.connect(player2).awardVMFHoldingsToppings();

      // Check total toppings
      const player1Info = await pizzaParty.getPlayerInfo(player1.address);
      const player2Info = await pizzaParty.getPlayerInfo(player2.address);

      const totalToppings = player1Info.totalToppings.add(player2Info.totalToppings);
      expect(totalToppings).to.be.gt(0);
    });

    it("Should handle weekly winner selection", async function () {
      // Setup multiple players with toppings
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player1).enterDailyGame("");
      await pizzaParty.connect(player1).awardVMFHoldingsToppings();

      await vmfToken.connect(player2).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player2).enterDailyGame("");
      await pizzaParty.connect(player2).awardVMFHoldingsToppings();

      // Fast forward time to allow weekly draw
      await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]); // 7 days
      await ethers.provider.send("evm_mine", []);

      // Draw weekly winners
      await pizzaParty.connect(owner).drawWeeklyWinners();

      // Check that winners were selected
      // Note: This would require checking events or contract state
    });
  });

  describe("Referral System Integration", function () {
    it("Should create and use referral codes", async function () {
      // Player 1 creates referral code
      await pizzaParty.connect(player1).createReferralCode();

      // Player 2 uses the referral code
      await vmfToken.connect(player2).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player2).enterDailyGame("PLAYER1_REFERRAL_CODE");

      // Check referral success
      const referralInfo = await pizzaParty.getReferralInfo(player1.address);
      expect(referralInfo.totalReferrals).to.equal(1);
    });

    it("Should award toppings for successful referrals", async function () {
      // Player 1 creates referral code
      await pizzaParty.connect(player1).createReferralCode();

      // Player 2 uses referral code
      await vmfToken.connect(player2).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player2).enterDailyGame("PLAYER1_REFERRAL_CODE");

      // Check that both players got toppings
      const player1Info = await pizzaParty.getPlayerInfo(player1.address);
      const player2Info = await pizzaParty.getPlayerInfo(player2.address);

      expect(player1Info.totalToppings).to.be.gt(0);
      expect(player2Info.totalToppings).to.be.gt(0);
    });

    it("Should prevent self-referral", async function () {
      // Player creates referral code
      await pizzaParty.connect(player1).createReferralCode();

      // Try to use own referral code
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await expect(
        pizzaParty.connect(player1).enterDailyGame("PLAYER1_REFERRAL_CODE")
      ).to.be.revertedWith("Cannot refer yourself");
    });

    it("Should handle multiple referrals", async function () {
      // Player 1 creates referral code
      await pizzaParty.connect(player1).createReferralCode();

      // Multiple players use the referral code
      await vmfToken.connect(player2).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player2).enterDailyGame("PLAYER1_REFERRAL_CODE");

      await vmfToken.connect(player3).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player3).enterDailyGame("PLAYER1_REFERRAL_CODE");

      // Check total referrals
      const referralInfo = await pizzaParty.getReferralInfo(player1.address);
      expect(referralInfo.totalReferrals).to.equal(2);
    });
  });

  describe("VMF Token Integration", function () {
    it("Should handle VMF token transfers correctly", async function () {
      const initialBalance = await vmfToken.balanceOf(player1.address);
      
      // Player enters game
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player1).enterDailyGame("");

      const finalBalance = await vmfToken.balanceOf(player1.address);
      expect(finalBalance).to.be.lt(initialBalance);
    });

    it("Should award toppings based on VMF holdings", async function () {
      // Give player more VMF
      await vmfToken.mint(player1.address, ethers.utils.parseEther("20"));
      
      // Award toppings based on holdings
      await pizzaParty.connect(player1).awardVMFHoldingsToppings();

      // Check toppings awarded
      const playerInfo = await pizzaParty.getPlayerInfo(player1.address);
      expect(playerInfo.totalToppings).to.be.gt(0);
    });

    it("Should handle insufficient VMF balance", async function () {
      // Transfer all VMF away
      await vmfToken.connect(player1).transfer(owner.address, await vmfToken.balanceOf(player1.address));

      // Try to enter game
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.be.revertedWith("Insufficient VMF balance");
    });
  });

  describe("Admin Functions Integration", function () {
    it("Should allow owner to pause and unpause contract", async function () {
      // Pause contract
      await pizzaParty.connect(owner).emergencyPause(true);

      // Try to enter game (should fail)
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.be.revertedWith("Pausable: paused");

      // Unpause contract
      await pizzaParty.connect(owner).emergencyPause(false);

      // Should be able to enter game now
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.not.be.reverted;
    });

    it("Should handle blacklist management", async function () {
      // Blacklist a player
      await pizzaParty.connect(owner).setPlayerBlacklist(player1.address, true);

      // Try to enter game (should fail)
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.be.revertedWith("Player is blacklisted");

      // Unblacklist player
      await pizzaParty.connect(owner).setPlayerBlacklist(player1.address, false);

      // Should be able to enter game now
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.not.be.reverted;
    });

    it("Should handle emergency withdrawal", async function () {
      // Get some VMF into the contract
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player1).enterDailyGame("");

      // Emergency withdrawal
      const ownerBalanceBefore = await vmfToken.balanceOf(owner.address);
      await pizzaParty.connect(owner).emergencyWithdraw();
      const ownerBalanceAfter = await vmfToken.balanceOf(owner.address);

      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });
  });

  describe("Event Integration", function () {
    it("Should emit correct events for game entry", async function () {
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      const tx = await pizzaParty.connect(player1).enterDailyGame("");
      const receipt = await tx.wait();

      // Check for PlayerEntered event
      const event = receipt.events?.find(e => e.event === "PlayerEntered");
      expect(event).to.not.be.undefined;
      expect(event?.args?.player).to.equal(player1.address);
    });

    it("Should emit correct events for referral creation", async function () {
      const tx = await pizzaParty.connect(player1).createReferralCode();
      const receipt = await tx.wait();

      // Check for ReferralCreated event
      const event = receipt.events?.find(e => e.event === "ReferralCreated");
      expect(event).to.not.be.undefined;
      expect(event?.args?.referrer).to.equal(player1.address);
    });

    it("Should emit correct events for toppings awarded", async function () {
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      const tx = await pizzaParty.connect(player1).enterDailyGame("");
      const receipt = await tx.wait();

      // Check for ToppingsAwarded event
      const event = receipt.events?.find(e => e.event === "ToppingsAwarded");
      expect(event).to.not.be.undefined;
      expect(event?.args?.player).to.equal(player1.address);
    });
  });

  describe("Gas Optimization Integration", function () {
    it("Should use reasonable gas for common operations", async function () {
      // Test gas usage for entering game
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      const tx = await pizzaParty.connect(player1).enterDailyGame("");
      const receipt = await tx.wait();

      // Gas should be reasonable
      expect(receipt.gasUsed).to.be.lt(300000);
    });

    it("Should optimize storage for multiple players", async function () {
      // Multiple players enter game
      for (let i = 0; i < 5; i++) {
        const player = [player1, player2, player3][i % 3];
        await vmfToken.connect(player).approve(pizzaParty.address, ethers.utils.parseEther("1"));
        await pizzaParty.connect(player).enterDailyGame("");
      }

      // Check that all entries were recorded
      const currentGame = await pizzaParty.getCurrentGame();
      expect(currentGame.totalEntries).to.equal(5);
    });
  });

  describe("Error Handling Integration", function () {
    it("Should handle network errors gracefully", async function () {
      // This would require mocking network failures
      // For now, we test that the contract handles errors properly
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.be.revertedWith("Insufficient VMF balance");
    });

    it("Should handle invalid input gracefully", async function () {
      // Test with invalid referral code
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await expect(
        pizzaParty.connect(player1).enterDailyGame("INVALID_CODE")
      ).to.be.revertedWith("Referral code not found");
    });
  });
});

// Mock VMF Token for integration testing
contract("MockVMF Integration", function () {
  it("Should integrate with PizzaParty contract", async function () {
    const MockVMF = await ethers.getContractFactory("MockVMF");
    const mockVMF = await MockVMF.deploy();
    await mockVMF.deployed();

    const PizzaParty = await ethers.getContractFactory("PizzaParty");
    const pizzaParty = await PizzaParty.deploy(mockVMF.address);
    await pizzaParty.deployed();

    const [owner, player] = await ethers.getSigners();

    // Setup
    await mockVMF.mint(player.address, ethers.utils.parseEther("10"));
    await mockVMF.connect(player).approve(pizzaParty.address, ethers.utils.parseEther("1"));

    // Test integration
    await expect(
      pizzaParty.connect(player).enterDailyGame("")
    ).to.not.be.reverted;
  });
}); 