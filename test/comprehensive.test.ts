import { expect } from "chai";
import { ethers } from "hardhat";

describe("PizzaParty Comprehensive Tests", function () {
  let pizzaParty: any;
  let mockVMF: any;
  let owner: any;
  let player1: any;
  let player2: any;
  let player3: any;

  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners();

    // Deploy mock VMF token
    const MockVMF = await ethers.getContractFactory("MockVMF");
    mockVMF = await MockVMF.deploy();
    await mockVMF.waitForDeployment();

    // Deploy PizzaParty contract
    const PizzaParty = await ethers.getContractFactory("PizzaParty");
    pizzaParty = await PizzaParty.deploy(await mockVMF.getAddress());
    await pizzaParty.waitForDeployment();

    // Setup initial balances
    await mockVMF.mint(player1.address, ethers.parseEther("10"));
    await mockVMF.mint(player2.address, ethers.parseEther("10"));
    await mockVMF.mint(player3.address, ethers.parseEther("10"));
  });

  describe("Contract Deployment", function () {
    it("Should deploy with correct VMF token address", async function () {
      expect(await pizzaParty.vmfToken()).to.equal(await mockVMF.getAddress());
    });

    it("Should initialize with correct owner", async function () {
      expect(await pizzaParty.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero jackpots", async function () {
      expect(await pizzaParty.currentDailyJackpot()).to.equal(0);
      expect(await pizzaParty.currentWeeklyJackpot()).to.equal(0);
    });
  });

  describe("Daily Game Functionality", function () {
    it("Should allow players to enter daily game", async function () {
      await mockVMF.connect(player1).approve(await pizzaParty.getAddress(), ethers.parseEther("1"));
      await expect(pizzaParty.connect(player1).enterDailyGame(""))
        .to.emit(pizzaParty, "PlayerEntered")
        .withArgs(player1.address, 1, ethers.parseEther("1"));
    });

    it("Should prevent double entry on same day", async function () {
      await mockVMF.connect(player1).approve(await pizzaParty.getAddress(), ethers.parseEther("2"));
      await pizzaParty.connect(player1).enterDailyGame("");
      await expect(pizzaParty.connect(player1).enterDailyGame(""))
        .to.be.revertedWith("Already entered today");
    });

    it("Should require sufficient VMF balance", async function () {
      await mockVMF.connect(player1).transfer(owner.address, await mockVMF.balanceOf(player1.address));
      await expect(pizzaParty.connect(player1).enterDailyGame(""))
        .to.be.revertedWith("Insufficient VMF balance");
    });
  });

  describe("Referral System", function () {
    it("Should create referral codes", async function () {
      await expect(pizzaParty.connect(player1).createReferralCode())
        .to.emit(pizzaParty, "ReferralCreated");
    });

    it("Should prevent self-referral", async function () {
      await pizzaParty.connect(player1).createReferralCode();
      await mockVMF.connect(player1).approve(await pizzaParty.getAddress(), ethers.parseEther("1"));
      await expect(pizzaParty.connect(player1).enterDailyGame("PLAYER1_REFERRAL_CODE"))
        .to.be.revertedWith("Referral code not found");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to pause contract", async function () {
      await expect(pizzaParty.connect(owner).emergencyPause(true))
        .to.emit(pizzaParty, "EmergencyPause")
        .withArgs(true);
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(pizzaParty.connect(player1).emergencyPause(true))
        .to.be.revertedWithCustomError(pizzaParty, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to blacklist players", async function () {
      await expect(pizzaParty.connect(owner).setPlayerBlacklist(player1.address, true))
        .to.emit(pizzaParty, "PlayerBlacklisted")
        .withArgs(player1.address, true);
    });

    it("Should prevent blacklisted players from entering", async function () {
      await pizzaParty.connect(owner).setPlayerBlacklist(player1.address, true);
      await mockVMF.connect(player1).approve(await pizzaParty.getAddress(), ethers.parseEther("1"));
      await expect(pizzaParty.connect(player1).enterDailyGame(""))
        .to.be.revertedWith("Player is blacklisted");
    });
  });

  describe("View Functions", function () {
    it("Should return correct player info", async function () {
      const playerInfo = await pizzaParty.getPlayerInfo(player1.address);
      expect(playerInfo.totalToppings).to.equal(0);
      expect(playerInfo.dailyEntries).to.equal(0);
      expect(playerInfo.isBlacklisted).to.equal(false);
    });

    it("Should check if player has entered today", async function () {
      expect(await pizzaParty.hasEnteredToday(player1.address)).to.equal(false);
      
      await mockVMF.connect(player1).approve(await pizzaParty.getAddress(), ethers.parseEther("1"));
      await pizzaParty.connect(player1).enterDailyGame("");
      
      expect(await pizzaParty.hasEnteredToday(player1.address)).to.equal(true);
    });

    it("Should return current game info", async function () {
      const currentGame = await pizzaParty.getCurrentGame();
      expect(currentGame.totalEntries).to.equal(0);
      expect(currentGame.isCompleted).to.equal(false);
    });
  });

  describe("Game Constants", function () {
    it("Should have correct daily entry fee", async function () {
      expect(await pizzaParty.DAILY_ENTRY_FEE()).to.equal(ethers.parseEther("1"));
    });

    it("Should have correct winner counts", async function () {
      expect(await pizzaParty.DAILY_WINNERS_COUNT()).to.equal(8);
      expect(await pizzaParty.WEEKLY_WINNERS_COUNT()).to.equal(10);
    });

    it("Should have correct reward amounts", async function () {
      expect(await pizzaParty.DAILY_PLAY_REWARD()).to.equal(1);
      expect(await pizzaParty.REFERRAL_REWARD()).to.equal(2);
      expect(await pizzaParty.VMF_HOLDING_REWARD()).to.equal(2);
      expect(await pizzaParty.STREAK_BONUS()).to.equal(3);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow emergency withdrawal", async function () {
      // Get some VMF into contract
      await mockVMF.connect(player1).approve(await pizzaParty.getAddress(), ethers.parseEther("1"));
      await pizzaParty.connect(player1).enterDailyGame("");
      
      const ownerBalanceBefore = await mockVMF.balanceOf(owner.address);
      await pizzaParty.connect(owner).emergencyWithdraw();
      const ownerBalanceAfter = await mockVMF.balanceOf(owner.address);
      
      expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore);
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for common operations", async function () {
      await mockVMF.connect(player1).approve(await pizzaParty.getAddress(), ethers.parseEther("1"));
      const tx = await pizzaParty.connect(player1).enterDailyGame("");
      const receipt = await tx.wait();
      
      // Gas should be reasonable for simple operation
      expect(receipt.gasUsed).to.be.lt(300000);
    });
  });
}); 