const { ethers } = require("hardhat");

class AutomatedWinnerSelection {
  constructor() {
    this.vrfContract = null;
    this.provider = null;
    this.signer = null;
    this.VRF_ADDRESS = "0xCCa74Fb01e4aec664b8F57Db1Ce6b702AF8f5a59";
    this.isRunning = false;
    this.pendingRequests = new Map();
  }

  async initialize() {
    console.log("🤖 Initializing Automated Winner Selection System...");
    
    this.provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    this.vrfContract = new ethers.Contract(this.VRF_ADDRESS, [
      "function requestDailyRandomness(uint256 gameId, address[] calldata eligiblePlayers) external returns (uint256 requestId)",
      "function requestWeeklyRandomness(uint256 gameId, address[] calldata eligiblePlayers) external returns (uint256 requestId)",
      "function getRequest(uint256 requestId) external view returns (tuple(uint256 gameId, string gameType, bool fulfilled, uint256[] randomWords, address[] eligiblePlayers))",
      "function isRequestFulfilled(uint256 requestId) external view returns (bool)",
      "function getVRFConfig() external view returns (address, uint64, bytes32, uint32, uint16, uint32)",
      "event WinnersSelected(uint256 indexed gameId, string gameType, address[] winners, uint256[] randomWords)",
      "event RandomnessRequested(uint256 indexed requestId, uint256 indexed gameId, string gameType)"
    ], this.signer);

    console.log("✅ VRF Contract connected:", this.VRF_ADDRESS);
    
    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    console.log("👂 Setting up event listeners...");
    
    // Listen for new randomness requests
    this.vrfContract.on("RandomnessRequested", (requestId, gameId, gameType) => {
      console.log(`🎲 New VRF request: ID ${requestId}, Game ${gameId}, Type: ${gameType}`);
      this.pendingRequests.set(requestId.toString(), {
        gameId: gameId.toString(),
        gameType: gameType,
        timestamp: Date.now(),
        status: 'pending'
      });
    });

    // Listen for winner selection
    this.vrfContract.on("WinnersSelected", (gameId, gameType, winners, randomWords) => {
      console.log(`🏆 Winners selected for ${gameType} game ${gameId}:`, winners);
      this.processWinners(gameId, gameType, winners, randomWords);
    });

    console.log("✅ Event listeners active");
  }

  async requestDailyWinners(gameId, eligiblePlayers) {
    console.log(`🎲 Requesting daily winners for game ${gameId}...`);
    console.log(`📋 Eligible players: ${eligiblePlayers.length}`);
    
    try {
      const requestId = await this.vrfContract.requestDailyRandomness(gameId, eligiblePlayers);
      console.log(`✅ Daily VRF request submitted: ${requestId}`);
      
      // Start monitoring this request
      this.monitorRequest(requestId, 'daily', gameId);
      
      return requestId;
    } catch (error) {
      console.error("❌ Daily VRF request failed:", error.message);
      throw error;
    }
  }

  async requestWeeklyWinners(gameId, eligiblePlayers) {
    console.log(`🎲 Requesting weekly winners for game ${gameId}...`);
    console.log(`📋 Eligible players: ${eligiblePlayers.length}`);
    
    try {
      const requestId = await this.vrfContract.requestWeeklyRandomness(gameId, eligiblePlayers);
      console.log(`✅ Weekly VRF request submitted: ${requestId}`);
      
      // Start monitoring this request
      this.monitorRequest(requestId, 'weekly', gameId);
      
      return requestId;
    } catch (error) {
      console.error("❌ Weekly VRF request failed:", error.message);
      throw error;
    }
  }

  async monitorRequest(requestId, gameType, gameId) {
    console.log(`⏳ Monitoring VRF request ${requestId} for ${gameType} game ${gameId}...`);
    
    const maxWaitTime = 5 * 60 * 1000; // 5 minutes
    const checkInterval = 10 * 1000; // 10 seconds
    const startTime = Date.now();
    
    const checkFulfillment = async () => {
      try {
        const isFulfilled = await this.vrfContract.isRequestFulfilled(requestId);
        
        if (isFulfilled) {
          console.log(`✅ VRF request ${requestId} fulfilled!`);
          await this.handleFulfilledRequest(requestId, gameType, gameId);
          return;
        }
        
        // Check if we've exceeded max wait time
        if (Date.now() - startTime > maxWaitTime) {
          console.log(`⏰ VRF request ${requestId} timed out after 5 minutes`);
          this.pendingRequests.delete(requestId.toString());
          return;
        }
        
        // Continue monitoring
        setTimeout(checkFulfillment, checkInterval);
        
      } catch (error) {
        console.error(`❌ Error monitoring request ${requestId}:`, error.message);
      }
    };
    
    // Start monitoring
    setTimeout(checkFulfillment, checkInterval);
  }

  async handleFulfilledRequest(requestId, gameType, gameId) {
    try {
      console.log(`📋 Getting winners for request ${requestId}...`);
      
      const request = await this.vrfContract.getRequest(requestId);
      
      if (request.fulfilled && request.winners.length > 0) {
        console.log(`🏆 Winners for ${gameType} game ${gameId}:`, request.winners);
        console.log(`🎲 Random words used:`, request.randomWords);
        
        // Process prizes for winners
        await this.processWinners(gameId, gameType, request.winners, request.randomWords);
        
        // Remove from pending requests
        this.pendingRequests.delete(requestId.toString());
        
      } else {
        console.log(`⚠️ Request ${requestId} fulfilled but no winners found`);
      }
      
    } catch (error) {
      console.error(`❌ Error handling fulfilled request ${requestId}:`, error.message);
    }
  }

  async processWinners(gameId, gameType, winners, randomWords) {
    console.log(`💰 Processing prizes for ${gameType} winners...`);
    
    try {
      // Calculate prize amounts
      const prizePerWinner = await this.calculatePrizeAmount(gameId, gameType, winners.length);
      
      console.log(`💸 Prize per winner: ${ethers.formatEther(prizePerWinner)} ETH`);
      
      // Process each winner
      for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];
        if (winner !== ethers.ZeroAddress) {
          console.log(`🏆 Winner ${i + 1}: ${winner}`);
          
          // Here you would integrate with your prize distribution system
          await this.distributePrize(winner, prizePerWinner, gameType, gameId);
        }
      }
      
      // Log the complete winner selection
      await this.logWinnerSelection(gameId, gameType, winners, randomWords, prizePerWinner);
      
      console.log(`✅ Prize distribution complete for ${gameType} game ${gameId}`);
      
    } catch (error) {
      console.error(`❌ Error processing winners:`, error.message);
    }
  }

  async calculatePrizeAmount(gameId, gameType, winnerCount) {
    // This would integrate with your jackpot/prize pool system
    // For now, using a simple calculation
    const basePrize = ethers.parseEther("0.1"); // 0.1 ETH base prize
    const totalPrize = basePrize * BigInt(winnerCount);
    
    return totalPrize / BigInt(winnerCount);
  }

  async distributePrize(winner, amount, gameType, gameId) {
    // This would integrate with your actual prize distribution system
    // For now, just logging the distribution
    console.log(`💸 Distributing ${ethers.formatEther(amount)} ETH to ${winner}`);
    
    // You could add:
    // - Transfer tokens/ETH to winner
    // - Update leaderboard
    // - Send notifications
    // - Update database
  }

  async logWinnerSelection(gameId, gameType, winners, randomWords, prizePerWinner) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      gameId: gameId.toString(),
      gameType: gameType,
      winners: winners,
      randomWords: randomWords.map(w => w.toString()),
      prizePerWinner: ethers.formatEther(prizePerWinner),
      totalWinners: winners.length
    };
    
    // Save to file
    const fs = require('fs');
    const logFile = 'winner-selections.json';
    
    let logs = [];
    if (fs.existsSync(logFile)) {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    
    logs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    
    console.log(`📝 Winner selection logged to ${logFile}`);
  }

  async getEligiblePlayers(gameId, gameType) {
    // This would integrate with your game logic to get actual eligible players
    // For now, returning example players
    console.log(`🔍 Getting eligible players for ${gameType} game ${gameId}...`);
    
    // Replace this with your actual logic to get eligible players
    const examplePlayers = [
      "0x1234567890123456789012345678901234567890",
      "0x2345678901234567890123456789012345678901",
      "0x3456789012345678901234567890123456789012",
      "0x4567890123456789012345678901234567890123",
      "0x5678901234567890123456789012345678901234"
    ];
    
    console.log(`📋 Found ${examplePlayers.length} eligible players`);
    return examplePlayers;
  }

  async startAutomatedSelection() {
    if (this.isRunning) {
      console.log("⚠️ Automated selection already running");
      return;
    }
    
    this.isRunning = true;
    console.log("🤖 Starting automated winner selection system...");
    
    // Run the automated process
    this.runAutomatedProcess();
  }

  async runAutomatedProcess() {
    while (this.isRunning) {
      try {
        console.log("\n🔄 Running automated winner selection cycle...");
        
        // Check if daily draw is ready (every 24 hours)
        if (await this.isDailyDrawReady()) {
          console.log("📅 Daily draw ready, selecting winners...");
          const gameId = await this.getCurrentGameId();
          const eligiblePlayers = await this.getEligiblePlayers(gameId, 'daily');
          
          if (eligiblePlayers.length > 0) {
            await this.requestDailyWinners(gameId, eligiblePlayers);
          } else {
            console.log("⚠️ No eligible players for daily draw");
          }
        }
        
        // Check if weekly draw is ready (every 7 days)
        if (await this.isWeeklyDrawReady()) {
          console.log("📅 Weekly draw ready, selecting winners...");
          const gameId = await this.getCurrentGameId();
          const eligiblePlayers = await this.getEligiblePlayers(gameId, 'weekly');
          
          if (eligiblePlayers.length > 0) {
            await this.requestWeeklyWinners(gameId, eligiblePlayers);
          } else {
            console.log("⚠️ No eligible players for weekly draw");
          }
        }
        
        // Wait before next cycle (check every hour)
        console.log("⏳ Waiting 1 hour before next cycle...");
        await new Promise(resolve => setTimeout(resolve, 60 * 60 * 1000));
        
      } catch (error) {
        console.error("❌ Error in automated process:", error.message);
        // Wait 5 minutes before retrying
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
      }
    }
  }

  async isDailyDrawReady() {
    // This would integrate with your game logic
    // For now, returning true for demonstration
    return true;
  }

  async isWeeklyDrawReady() {
    // This would integrate with your game logic
    // For now, returning false for demonstration
    return false;
  }

  async getCurrentGameId() {
    // This would integrate with your game logic
    return 1;
  }

  stop() {
    console.log("🛑 Stopping automated winner selection system...");
    this.isRunning = false;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      pendingRequests: this.pendingRequests.size,
      vrfContract: this.VRF_ADDRESS
    };
  }
}

// Main execution
async function main() {
  console.log("🚀 Starting Automated VRF Winner Selection System...");
  
  const automatedSystem = new AutomatedWinnerSelection();
  
  try {
    await automatedSystem.initialize();
    
    // Start the automated system
    await automatedSystem.startAutomatedSelection();
    
  } catch (error) {
    console.error("❌ Automated system failed:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

if (require.main === module) {
  main();
}

module.exports = AutomatedWinnerSelection;
