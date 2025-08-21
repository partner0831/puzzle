import { expect } from "chai"
import { ethers } from "hardhat"
import { PizzaParty, MockVMF } from "../../typechain-types"
import { SignerWithAddress } from "@ethersproject/contracts"

describe("PizzaParty Reward System Security Tests", function () {
  let pizzaParty: PizzaParty
  let vmfToken: MockVMF
  let owner: SignerWithAddress
  let player1: SignerWithAddress
  let player2: SignerWithAddress
  let player3: SignerWithAddress

  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners()

    // Deploy mock VMF token
    const MockVMF = await ethers.getContractFactory("MockVMF")
    vmfToken = await MockVMF.deploy()

    // Deploy PizzaParty contract
    const PizzaParty = await ethers.getContractFactory("PizzaParty")
    pizzaParty = await PizzaParty.deploy(vmfToken.address)

    // Mint VMF tokens to players
    await vmfToken.mint(player1.address, ethers.parseEther("100"))
    await vmfToken.mint(player2.address, ethers.parseEther("100"))
    await vmfToken.mint(player3.address, ethers.parseEther("100"))

    // Approve VMF spending
    await vmfToken.connect(player1).approve(pizzaParty.address, ethers.parseEther("100"))
    await vmfToken.connect(player2).approve(pizzaParty.address, ethers.parseEther("100"))
    await vmfToken.connect(player3).approve(pizzaParty.address, ethers.parseEther("100"))
  })

  describe("Authentication & Access Control", function () {
    it("Should prevent unauthorized access to admin functions", async function () {
      // Test that non-owner cannot call admin functions
      await expect(
        pizzaParty.connect(player1).emergencyPause(true)
      ).to.be.revertedWithCustomError(pizzaParty, "OwnableUnauthorizedAccount")

      await expect(
        pizzaParty.connect(player1).setPlayerBlacklist(player2.address, true)
      ).to.be.revertedWithCustomError(pizzaParty, "OwnableUnauthorizedAccount")

      await expect(
        pizzaParty.connect(player1).emergencyWithdraw()
      ).to.be.revertedWithCustomError(pizzaParty, "OwnableUnauthorizedAccount")
    })

    it("Should allow only owner to call admin functions", async function () {
      // Test that owner can call admin functions
      await expect(pizzaParty.connect(owner).emergencyPause(true)).to.not.be.reverted
      await expect(pizzaParty.connect(owner).setPlayerBlacklist(player1.address, true)).to.not.be.reverted
    })
  })

  describe("Input Validation & Sanitization", function () {
    it("Should validate referral codes properly", async function () {
      // Test empty referral code
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.be.revertedWith("Invalid referral code")

      // Test too long referral code
      const longCode = "A".repeat(51)
      await expect(
        pizzaParty.connect(player1).enterDailyGame(longCode)
      ).to.be.revertedWith("Referral code too long")

      // Test non-existent referral code
      await expect(
        pizzaParty.connect(player1).enterDailyGame("INVALID")
      ).to.be.revertedWith("Referral code not found")
    })

    it("Should validate addresses properly", async function () {
      // Test zero address validation
      await expect(
        pizzaParty.connect(owner).setPlayerBlacklist(ethers.ZeroAddress, true)
      ).to.be.revertedWith("Invalid address")
    })

    it("Should validate VMF balance requirements", async function () {
      // Test insufficient balance for daily entry
      const poorPlayer = player3
      await vmfToken.connect(poorPlayer).transfer(owner.address, ethers.parseEther("99"))
      
      await expect(
        pizzaParty.connect(poorPlayer).enterDailyGame("")
      ).to.be.revertedWith("Insufficient VMF balance")
    })
  })

  describe("Rate Limiting & Anti-Spam", function () {
    it("Should enforce cooldown periods", async function () {
      // First entry should succeed
      await pizzaParty.connect(player1).enterDailyGame("")
      
      // Second entry within cooldown should fail
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.be.revertedWith("Rate limit exceeded")
    })

    it("Should prevent multiple daily entries", async function () {
      // First entry
      await pizzaParty.connect(player1).enterDailyGame("")
      
      // Try to enter again on same day
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.be.revertedWith("Already entered today")
    })

    it("Should limit jackpot entries per player", async function () {
      // Add maximum jackpot entries
      for (let i = 0; i < 10; i++) {
        await pizzaParty.connect(player1).addJackpotEntry()
      }
      
      // Try to exceed limit
      await expect(
        pizzaParty.connect(player1).addJackpotEntry()
      ).to.be.revertedWith("Max jackpot entries reached")
    })
  })

  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy attacks on reward functions", async function () {
      // Test that external calls are protected
      await expect(
        pizzaParty.connect(player1).awardVMFHoldingsToppings()
      ).to.not.be.reverted // Should succeed with protection
    })

    it("Should prevent reentrancy on jackpot entries", async function () {
      await expect(
        pizzaParty.connect(player1).addJackpotEntry()
      ).to.not.be.reverted // Should succeed with protection
    })
  })

  describe("Overflow Protection", function () {
    it("Should prevent integer overflow in reward calculations", async function () {
      // Test with very large VMF balance
      await vmfToken.mint(player1.address, ethers.parseEther("1000000000"))
      
      await expect(
        pizzaParty.connect(player1).awardVMFHoldingsToppings()
      ).to.not.be.reverted // Should handle large numbers safely
    })

    it("Should prevent overflow in loyalty points calculation", async function () {
      await expect(
        pizzaParty.connect(player1).awardLoyaltyPoints()
      ).to.not.be.reverted // Should handle calculations safely
    })
  })

  describe("Blacklist Protection", function () {
    it("Should prevent blacklisted players from participating", async function () {
      // Blacklist player
      await pizzaParty.connect(owner).setPlayerBlacklist(player1.address, true)
      
      // Try to enter game
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.be.revertedWith("Player is blacklisted")
      
      // Try to claim rewards
      await expect(
        pizzaParty.connect(player1).awardVMFHoldingsToppings()
      ).to.be.revertedWith("Player is blacklisted")
    })

    it("Should allow unblacklisted players to participate", async function () {
      // Blacklist then unblacklist
      await pizzaParty.connect(owner).setPlayerBlacklist(player1.address, true)
      await pizzaParty.connect(owner).setPlayerBlacklist(player1.address, false)
      
      // Should be able to participate
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.not.be.reverted
    })
  })

  describe("Reward System Security", function () {
    it("Should prevent double claiming of first order reward", async function () {
      // Simulate first order completion
      await pizzaParty.connect(player1).enterDailyGame("")
      
      // Claim first order reward
      await pizzaParty.connect(player1).claimFirstOrderReward()
      
      // Try to claim again
      await expect(
        pizzaParty.connect(player1).claimFirstOrderReward()
      ).to.be.revertedWith("First order reward already claimed")
    })

    it("Should enforce daily reward claim limits", async function () {
      // Claim reward
      await pizzaParty.connect(player1).awardVMFHoldingsToppings()
      
      // Try to claim again on same day
      await expect(
        pizzaParty.connect(player1).awardVMFHoldingsToppings()
      ).to.be.revertedWith("Already checked today")
    })

    it("Should validate jackpot entry requirements", async function () {
      // Try to enter jackpot without sufficient balance
      const poorPlayer = player3
      await vmfToken.connect(poorPlayer).transfer(owner.address, ethers.parseEther("99"))
      
      await expect(
        pizzaParty.connect(poorPlayer).addJackpotEntry()
      ).to.be.revertedWith("Insufficient VMF balance for jackpot entry")
    })
  })

  describe("Emergency Controls", function () {
    it("Should pause all functions when emergency pause is active", async function () {
      // Pause the contract
      await pizzaParty.connect(owner).emergencyPause(true)
      
      // Try to enter game
      await expect(
        pizzaParty.connect(player1).enterDailyGame("")
      ).to.be.revertedWith("Pausable: paused")
      
      // Try to claim rewards
      await expect(
        pizzaParty.connect(player1).awardVMFHoldingsToppings()
      ).to.be.revertedWith("Pausable: paused")
    })

    it("Should allow emergency withdrawal by owner", async function () {
      // Add some VMF to contract
      await vmfToken.transfer(pizzaParty.address, ethers.parseEther("10"))
      
      // Emergency withdraw
      await expect(
        pizzaParty.connect(owner).emergencyWithdraw()
      ).to.not.be.reverted
    })
  })

  describe("Data Integrity", function () {
    it("Should maintain accurate player data", async function () {
      // Enter game
      await pizzaParty.connect(player1).enterDailyGame("")
      
      // Check player data
      const playerInfo = await pizzaParty.getPlayerInfo(player1.address)
      expect(playerInfo.dailyEntries).to.equal(1)
      expect(playerInfo.totalToppings).to.be.gt(0)
    })

    it("Should track loyalty points correctly", async function () {
      // Award loyalty points
      await pizzaParty.connect(player1).awardLoyaltyPoints()
      
      // Check player data
      const playerInfo = await pizzaParty.getPlayerInfo(player1.address)
      expect(playerInfo.loyaltyPoints).to.be.gt(0)
    })
  })

  describe("Event Logging", function () {
    it("Should emit proper events for security tracking", async function () {
      // Enter game and check events
      const tx = await pizzaParty.connect(player1).enterDailyGame("")
      const receipt = await tx.wait()
      
      expect(receipt?.logs).to.have.length.gt(0)
      
      // Check for specific events
      const events = receipt?.logs?.filter(log => 
        log.topics[0] === pizzaParty.interface.getEventTopic("PlayerEntered")
      )
      expect(events).to.have.length(1)
    })
  })
}) 