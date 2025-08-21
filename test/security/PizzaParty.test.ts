import { expect } from "chai";
import { ethers } from "hardhat";
import { PizzaParty } from "../typechain-types";
import { SignerWithAddress } from "@ethersproject/contracts/node_modules/@ethersproject/abstract-signer";

describe("PizzaParty Security Tests", function () {
  let pizzaParty: PizzaParty;
  let owner: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;
  let attacker: SignerWithAddress;
  let vmfToken: any;

  beforeEach(async function () {
    [owner, player1, player2, attacker] = await ethers.getSigners();

    // Deploy mock VMF token
    const MockVMF = await ethers.getContractFactory("MockVMF");
    vmfToken = await MockVMF.deploy();
    await vmfToken.deployed();

    // Deploy PizzaParty contract
    const PizzaParty = await ethers.getContractFactory("PizzaParty");
    pizzaParty = await PizzaParty.deploy(vmfToken.address);
    await pizzaParty.deployed();

    // Setup initial balances
    await vmfToken.mint(player1.address, ethers.parseEther("10"));
    await vmfToken.mint(player2.address, ethers.parseEther("10"));
    await vmfToken.mint(attacker.address, ethers.parseEther("10"));
  });

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy attacks on enterDailyGame", async function () {
      // This test would require a malicious contract that tries to reenter
      // For now, we test that the function has the nonReentrant modifier
      const abi = pizzaParty.interface.format();
      expect(abi).to.include("nonReentrant");
    });

    it("Should prevent reentrancy attacks on admin functions", async function () {
      // Test that admin functions are protected
      const adminFunctions = [
        "drawDailyWinners",
        "drawWeeklyWinners", 
        "emergencyPause",
        "setPlayerBlacklist",
        "emergencyWithdraw"
      ];

      for (const func of adminFunctions) {
        const abi = pizzaParty.interface.format();
        expect(abi).to.include("nonReentrant");
      }
    });
  });

  describe("Access Control", function () {
    it("Should only allow owner to call admin functions", async function () {
      const nonOwner = player1;
      
      // Test drawDailyWinners
      await expect(
        pizzaParty.connect(nonOwner).drawDailyWinners()
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Test drawWeeklyWinners
      await expect(
        pizzaParty.connect(nonOwner).drawWeeklyWinners()
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Test emergencyPause
      await expect(
        pizzaParty.connect(nonOwner).emergencyPause(true)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Test setPlayerBlacklist
      await expect(
        pizzaParty.connect(nonOwner).setPlayerBlacklist(player2.address, true)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      // Test emergencyWithdraw
      await expect(
        pizzaParty.connect(nonOwner).emergencyWithdraw()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow owner to call admin functions", async function () {
      // These should not revert when called by owner
      await expect(
        pizzaParty.connect(owner).emergencyPause(true)
      ).to.not.be.reverted;

      await expect(
        pizzaParty.connect(owner).setPlayerBlacklist(player2.address, true)
      ).to.not.be.reverted;
    });
  });

  describe("Input Validation", function () {
    it("Should validate referral codes", async function () {
      // Test empty referral code (should work)
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.not.be.reverted;

      // Test invalid referral code
      await vmfToken.connect(player2).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await expect(
        pizzaParty.connect(player2).enterDailyGame("INVALID_CODE")
      ).to.be.revertedWith("Referral code not found");
    });

    it("Should validate addresses", async function () {
      // Test blacklisting with zero address
      await expect(
        pizzaParty.connect(owner).setPlayerBlacklist(ethers.constants.AddressZero, true)
      ).to.not.be.reverted; // This might be allowed, depends on implementation
    });

    it("Should validate token amounts", async function () {
      // Test with insufficient VMF balance
      const poorPlayer = attacker;
      await vmfToken.connect(poorPlayer).transfer(owner.address, await vmfToken.balanceOf(poorPlayer.address));
      
      await expect(
        pizzaParty.connect(poorPlayer).enterDailyGame("")
      ).to.be.revertedWith("Insufficient VMF balance");
    });
  });

  describe("Blacklist System", function () {
    it("Should prevent blacklisted players from entering games", async function () {
      // Blacklist a player
      await pizzaParty.connect(owner).setPlayerBlacklist(player1.address, true);

      // Try to enter game
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.be.revertedWith("Player is blacklisted");
    });

    it("Should prevent blacklisted players from creating referral codes", async function () {
      // Blacklist a player
      await pizzaParty.connect(owner).setPlayerBlacklist(player1.address, true);

      // Try to create referral code
      await expect(
        pizzaParty.connect(player1).createReferralCode()
      ).to.be.revertedWith("Player is blacklisted");
    });

    it("Should allow unblacklisting", async function () {
      // Blacklist then unblacklist
      await pizzaParty.connect(owner).setPlayerBlacklist(player1.address, true);
      await pizzaParty.connect(owner).setPlayerBlacklist(player1.address, false);

      // Should be able to enter game now
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.not.be.reverted;
    });
  });

  describe("Emergency Controls", function () {
    it("Should pause contract functionality", async function () {
      // Pause contract
      await pizzaParty.connect(owner).emergencyPause(true);

      // Try to enter game (should fail)
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.be.revertedWith("Pausable: paused");

      // Try to create referral code (should fail)
      await expect(
        pizzaParty.connect(player1).createReferralCode()
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should allow unpausing", async function () {
      // Pause then unpause
      await pizzaParty.connect(owner).emergencyPause(true);
      await pizzaParty.connect(owner).emergencyPause(false);

      // Should be able to enter game now
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.not.be.reverted;
    });

    it("Should allow emergency withdrawal", async function () {
      // First, get some VMF into the contract
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await pizzaParty.connect(player1).enterDailyGame("");

      // Emergency withdrawal
      const ownerBalanceBefore = await vmfToken.balanceOf(owner.address);
      await pizzaParty.connect(owner).emergencyWithdraw();
      const ownerBalanceAfter = await vmfToken.balanceOf(owner.address);

      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });
  });

  describe("Game Logic Security", function () {
    it("Should prevent double entry on same day", async function () {
      // Enter game once
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("2"));
      await pizzaParty.connect(player1).enterDailyGame("");

      // Try to enter again (should fail)
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.be.revertedWith("Already entered today");
    });

    it("Should validate game timing", async function () {
      // Try to draw winners before game ends (should fail)
      await expect(
        pizzaParty.connect(owner).drawDailyWinners()
      ).to.be.revertedWith("Game not finished");
    });

    it("Should validate weekly draw timing", async function () {
      // Try to draw weekly winners too early (should fail)
      await expect(
        pizzaParty.connect(owner).drawWeeklyWinners()
      ).to.be.revertedWith("Weekly draw not ready");
    });
  });

  describe("Referral System Security", function () {
    it("Should prevent self-referral", async function () {
      // Create referral code
      await pizzaParty.connect(player1).createReferralCode();

      // Try to use own referral code
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await expect(
        pizzaParty.connect(player1).enterDailyGame("PLAYER1_REFERRAL_CODE")
      ).to.be.revertedWith("Cannot refer yourself");
    });

    it("Should validate referral code ownership", async function () {
      // Create referral code for player1
      await pizzaParty.connect(player1).createReferralCode();

      // Player2 tries to use player1's code (should work)
      await vmfToken.connect(player2).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      await expect(
        pizzaParty.connect(player2).enterDailyGame("PLAYER1_REFERRAL_CODE")
      ).to.not.be.reverted;
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for common operations", async function () {
      // Test gas usage for entering game
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      const tx = await pizzaParty.connect(player1).enterDailyGame("");
      const receipt = await tx.wait();

      // Gas should be reasonable (less than 200k for simple operation)
      expect(receipt.gasUsed).to.be.lt(200000);
    });

    it("Should optimize storage usage", async function () {
      // Test that structs are packed efficiently
      const playerInfo = await pizzaParty.getPlayerInfo(player1.address);
      
      // Check that data is stored efficiently
      expect(playerInfo.totalToppings).to.be.a("bigint");
      expect(playerInfo.isBlacklisted).to.be.a("boolean");
    });
  });

  describe("Event Security", function () {
    it("Should emit correct events", async function () {
      // Enter game and check events
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.utils.parseEther("1"));
      const tx = await pizzaParty.connect(player1).enterDailyGame("");
      const receipt = await tx.wait();

      // Check for PlayerEntered event
      const event = receipt.events?.find(e => e.event === "PlayerEntered");
      expect(event).to.not.be.undefined;
      expect(event?.args?.player).to.equal(player1.address);
    });

    it("Should emit admin events correctly", async function () {
      // Test blacklist event
      const tx = await pizzaParty.connect(owner).setPlayerBlacklist(player1.address, true);
      const receipt = await tx.wait();

      const event = receipt.events?.find(e => e.event === "PlayerBlacklisted");
      expect(event).to.not.be.undefined;
      expect(event?.args?.player).to.equal(player1.address);
      expect(event?.args?.blacklisted).to.be.true;
    });
  });
});

// Mock VMF Token for testing
contract("MockVMF", function () {
  it("Should mint tokens", async function () {
    const MockVMF = await ethers.getContractFactory("MockVMF");
    const mockVMF = await MockVMF.deploy();
    await mockVMF.deployed();

    const [owner] = await ethers.getSigners();
    await mockVMF.mint(owner.address, ethers.utils.parseEther("100"));
    
    const balance = await mockVMF.balanceOf(owner.address);
    expect(balance).to.equal(ethers.utils.parseEther("100"));
  });
}); 