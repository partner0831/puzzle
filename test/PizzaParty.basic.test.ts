import { expect } from "chai";
import { ethers } from "hardhat";
import { PizzaParty } from "../typechain-types";

describe("PizzaParty Basic Tests", function () {
  let pizzaParty: PizzaParty;
  let owner: any;
  let player1: any;
  let player2: any;
  let vmfToken: any;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

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
  });

  describe("Contract Deployment", function () {
    it("Should deploy with correct VMF token address", async function () {
      expect(await pizzaParty.vmfToken()).to.equal(vmfToken.address);
    });

    it("Should initialize with correct owner", async function () {
      expect(await pizzaParty.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero jackpots", async function () {
      expect(await pizzaParty.currentDailyJackpot()).to.equal(0);
      expect(await pizzaParty.currentWeeklyJackpot()).to.equal(0);
    });
  });

  describe("Basic Game Functionality", function () {
    it("Should allow players to enter daily game", async function () {
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.parseEther("1"));
      await expect(pizzaParty.connect(player1).enterDailyGame(""))
        .to.emit(pizzaParty, "PlayerEntered")
        .withArgs(player1.address, 1, ethers.parseEther("1"));
    });

    it("Should prevent double entry on same day", async function () {
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.parseEther("2"));
      await pizzaParty.connect(player1).enterDailyGame("");
      await expect(pizzaParty.connect(player1).enterDailyGame(""))
        .to.be.revertedWith("Already entered today");
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
        .to.be.revertedWith("Ownable: caller is not the owner");
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
      
      await vmfToken.connect(player1).approve(pizzaParty.address, ethers.parseEther("1"));
      await pizzaParty.connect(player1).enterDailyGame("");
      
      expect(await pizzaParty.hasEnteredToday(player1.address)).to.equal(true);
    });
  });
}); 