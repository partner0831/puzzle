import { expect } from "chai"
import { ethers } from "hardhat"
import { FreeRandomness, MockVMF } from "../../typechain-types"
import { SignerWithAddress } from "@ethersproject/contracts"

describe("FreeRandomness Security Tests", function () {
  let freeRandomness: FreeRandomness
  let vmfToken: MockVMF
  let owner: SignerWithAddress
  let player1: SignerWithAddress
  let player2: SignerWithAddress
  let player3: SignerWithAddress
  let player4: SignerWithAddress

  beforeEach(async function () {
    [owner, player1, player2, player3, player4] = await ethers.getSigners()

    // Deploy mock VMF token
    const MockVMF = await ethers.getContractFactory("MockVMF")
    vmfToken = await MockVMF.deploy()

    // Deploy FreeRandomness contract
    const FreeRandomness = await ethers.getContractFactory("FreeRandomness")
    freeRandomness = await FreeRandomness.deploy()
  })

  describe("Commit-Reveal Scheme Security", function () {
    it("Should prevent commitment manipulation", async function () {
      // Request randomness
      const roundId = await freeRandomness.requestRandomness()
      
      // Generate commitment
      const randomValue = ethers.getBigInt(12345)
      const salt = ethers.randomBytes(32)
      const commitment = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "bytes32", "address"],
        [randomValue, salt, player1.address]
      ))
      
      // Submit commitment
      await freeRandomness.connect(player1).submitCommitment(roundId, commitment)
      
      // Try to submit same commitment again (should fail)
      await expect(
        freeRandomness.connect(player1).submitCommitment(roundId, commitment)
      ).to.be.revertedWith("Already contributed to this round")
    })

    it("Should enforce commit phase deadline", async function () {
      const roundId = await freeRandomness.requestRandomness()
      
      // Fast forward past deadline
      await ethers.provider.send("evm_increaseTime", [3601]) // 1 hour + 1 second
      await ethers.provider.send("evm_mine", [])
      
      const commitment = ethers.keccak256("test")
      
      await expect(
        freeRandomness.connect(player1).submitCommitment(roundId, commitment)
      ).to.be.revertedWith("Commit phase ended")
    })

    it("Should validate commitment hash", async function () {
      const roundId = await freeRandomness.requestRandomness()
      
      // Submit commitment
      const commitment = ethers.keccak256("test")
      await freeRandomness.connect(player1).submitCommitment(roundId, commitment)
      
      // Try to reveal with wrong values
      const wrongRandomValue = ethers.getBigInt(99999)
      const wrongSalt = ethers.randomBytes(32)
      
      await expect(
        freeRandomness.connect(player1).revealRandomness(roundId, wrongRandomValue, wrongSalt)
      ).to.be.revertedWith("Invalid commitment")
    })
  })

  describe("Multi-Party Randomness Security", function () {
    it("Should require minimum contributors", async function () {
      const roundId = await freeRandomness.requestRandomness()
      
      // Only 2 contributors (below minimum of 3)
      const commitment1 = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "bytes32", "address"],
        [ethers.getBigInt(111), ethers.randomBytes(32), player1.address]
      ))
      const commitment2 = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "bytes32", "address"],
        [ethers.getBigInt(222), ethers.randomBytes(32), player2.address]
      ))
      
      await freeRandomness.connect(player1).submitCommitment(roundId, commitment1)
      await freeRandomness.connect(player2).submitCommitment(roundId, commitment2)
      
      // Fast forward past commit phase
      await ethers.provider.send("evm_increaseTime", [3601])
      await ethers.provider.send("evm_mine", [])
      
      // Reveal values
      const salt1 = ethers.randomBytes(32)
      const salt2 = ethers.randomBytes(32)
      
      await freeRandomness.connect(player1).revealRandomness(roundId, ethers.getBigInt(111), salt1)
      await freeRandomness.connect(player2).revealRandomness(roundId, ethers.getBigInt(222), salt2)
      
      // Check that randomness is not finalized (not enough contributors)
      const roundInfo = await freeRandomness.getRoundInfo(roundId)
      expect(roundInfo.isComplete).to.be.false
    })

    it("Should finalize with sufficient contributors", async function () {
      const roundId = await freeRandomness.requestRandomness()
      
      // 3 contributors (minimum required)
      const commitments = []
      const randomValues = []
      const salts = []
      
      for (let i = 0; i < 3; i++) {
        const randomValue = ethers.getBigInt(1000 + i)
        const salt = ethers.randomBytes(32)
        const commitment = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "bytes32", "address"],
          [randomValue, salt, [player1, player2, player3][i].address]
        ))
        
        commitments.push(commitment)
        randomValues.push(randomValue)
        salts.push(salt)
      }
      
      // Submit commitments
      await freeRandomness.connect(player1).submitCommitment(roundId, commitments[0])
      await freeRandomness.connect(player2).submitCommitment(roundId, commitments[1])
      await freeRandomness.connect(player3).submitCommitment(roundId, commitments[2])
      
      // Fast forward past commit phase
      await ethers.provider.send("evm_increaseTime", [3601])
      await ethers.provider.send("evm_mine", [])
      
      // Reveal values
      await freeRandomness.connect(player1).revealRandomness(roundId, randomValues[0], salts[0])
      await freeRandomness.connect(player2).revealRandomness(roundId, randomValues[1], salts[1])
      await freeRandomness.connect(player3).revealRandomness(roundId, randomValues[2], salts[2])
      
      // Check that randomness is finalized
      const roundInfo = await freeRandomness.getRoundInfo(roundId)
      expect(roundInfo.isComplete).to.be.true
      expect(roundInfo.finalRandomNumber).to.be.gt(0)
    })
  })

  describe("Entropy Collection Security", function () {
    it("Should collect multiple entropy sources", async function () {
      const roundId = await freeRandomness.requestRandomness()
      
      // Submit and reveal with multiple contributors
      const contributors = [player1, player2, player3, player4]
      const randomValues = [111, 222, 333, 444]
      
      for (let i = 0; i < contributors.length; i++) {
        const randomValue = ethers.getBigInt(randomValues[i])
        const salt = ethers.randomBytes(32)
        const commitment = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "bytes32", "address"],
          [randomValue, salt, contributors[i].address]
        ))
        
        await freeRandomness.connect(contributors[i]).submitCommitment(roundId, commitment)
      }
      
      // Fast forward and reveal
      await ethers.provider.send("evm_increaseTime", [3601])
      await ethers.provider.send("evm_mine", [])
      
      for (let i = 0; i < contributors.length; i++) {
        const salt = ethers.randomBytes(32)
        await freeRandomness.connect(contributors[i]).revealRandomness(roundId, ethers.getBigInt(randomValues[i]), salt)
      }
      
      // Get final random number
      const finalRandom = await freeRandomness.getFinalRandomNumber(roundId)
      expect(finalRandom).to.be.gt(0)
      
      // Verify it's different from individual contributions
      for (let i = 0; i < randomValues.length; i++) {
        expect(finalRandom).to.not.equal(randomValues[i])
      }
    })
  })

  describe("Access Control Security", function () {
    it("Should prevent unauthorized force finalization", async function () {
      const roundId = await freeRandomness.requestRandomness()
      
      await expect(
        freeRandomness.connect(player1).forceFinalize(roundId)
      ).to.be.revertedWithCustomError(freeRandomness, "OwnableUnauthorizedAccount")
    })

    it("Should allow owner to force finalize", async function () {
      const roundId = await freeRandomness.requestRandomness()
      
      // Fast forward past reveal phase
      await ethers.provider.send("evm_increaseTime", [5401]) // 1.5 hours
      await ethers.provider.send("evm_mine", [])
      
      await expect(
        freeRandomness.connect(owner).forceFinalize(roundId)
      ).to.not.be.reverted
    })
  })

  describe("Randomness Quality Tests", function () {
    it("Should produce different random numbers for different rounds", async function () {
      const round1 = await freeRandomness.requestRandomness()
      const round2 = await freeRandomness.requestRandomness()
      
      // Submit same contributions to both rounds
      const contributors = [player1, player2, player3]
      const randomValues = [100, 200, 300]
      
      for (let round of [round1, round2]) {
        for (let i = 0; i < contributors.length; i++) {
          const randomValue = ethers.getBigInt(randomValues[i])
          const salt = ethers.randomBytes(32)
          const commitment = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
            ["uint256", "bytes32", "address"],
            [randomValue, salt, contributors[i].address]
          ))
          
          await freeRandomness.connect(contributors[i]).submitCommitment(round, commitment)
        }
        
        // Fast forward and reveal
        await ethers.provider.send("evm_increaseTime", [3601])
        await ethers.provider.send("evm_mine", [])
        
        for (let i = 0; i < contributors.length; i++) {
          const salt = ethers.randomBytes(32)
          await freeRandomness.connect(contributors[i]).revealRandomness(round, ethers.getBigInt(randomValues[i]), salt)
        }
      }
      
      const random1 = await freeRandomness.getFinalRandomNumber(round1)
      const random2 = await freeRandomness.getFinalRandomNumber(round2)
      
      // Should be different due to different block entropy
      expect(random1).to.not.equal(random2)
    })

    it("Should be unpredictable from individual contributions", async function () {
      const roundId = await freeRandomness.requestRandomness()
      
      const contributors = [player1, player2, player3]
      const randomValues = [111, 222, 333]
      
      for (let i = 0; i < contributors.length; i++) {
        const randomValue = ethers.getBigInt(randomValues[i])
        const salt = ethers.randomBytes(32)
        const commitment = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "bytes32", "address"],
          [randomValue, salt, contributors[i].address]
        ))
        
        await freeRandomness.connect(contributors[i]).submitCommitment(roundId, commitment)
      }
      
      // Fast forward and reveal
      await ethers.provider.send("evm_increaseTime", [3601])
      await ethers.provider.send("evm_mine", [])
      
      for (let i = 0; i < contributors.length; i++) {
        const salt = ethers.randomBytes(32)
        await freeRandomness.connect(contributors[i]).revealRandomness(roundId, ethers.getBigInt(randomValues[i]), salt)
      }
      
      const finalRandom = await freeRandomness.getFinalRandomNumber(roundId)
      
      // Final random should not be predictable from individual values
      expect(finalRandom).to.not.equal(randomValues[0])
      expect(finalRandom).to.not.equal(randomValues[1])
      expect(finalRandom).to.not.equal(randomValues[2])
      expect(finalRandom).to.not.equal(randomValues[0] + randomValues[1] + randomValues[2])
    })
  })

  describe("Gas Efficiency Tests", function () {
    it("Should handle maximum contributors efficiently", async function () {
      const roundId = await freeRandomness.requestRandomness()
      
      // Submit maximum number of commitments
      const maxContributors = await freeRandomness.maxContributors()
      
      for (let i = 0; i < Number(maxContributors); i++) {
        const randomValue = ethers.getBigInt(1000 + i)
        const salt = ethers.randomBytes(32)
        const commitment = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
          ["uint256", "bytes32", "address"],
          [randomValue, salt, player1.address]
        ))
        
        // Use different signers to avoid "already contributed" error
        const signer = await ethers.getSigner(i)
        await freeRandomness.connect(signer).submitCommitment(roundId, commitment)
      }
      
      // Should not revert due to gas limits
      const roundInfo = await freeRandomness.getRoundInfo(roundId)
      expect(roundInfo.totalContributors).to.equal(maxContributors)
    })
  })
}) 