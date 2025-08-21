require('dotenv').config();
const { ethers } = require("ethers");

class ScheduledWinnerSelection {
  constructor() {
    this.vrfContract = null;
    this.pizzaPartyContract = null;
    this.vmfTokenContract = null;
    this.provider = null;
    this.signer = null;
    this.VRF_ADDRESS = "0xefAe49039ADB963b1183869D1632D4CbC8F0603b"; // New ChainlinkVRF contract
    this.PIZZA_PARTY_ADDRESS = "0xCD8a3a397CdE223c47602d2C37a3b8a5B99a6460"; // New PizzaPartyCore contract
    this.VMF_TOKEN_ADDRESS = "0x2213414893259b0C48066Acd1763e7fbA97859E5";
    this.isRunning = false;
    this.pendingRequests = new Map();
    this.lastDailyDraw = null;
    this.lastWeeklyDraw = null;
    this.currentGameId = 1; // Start with game ID 1
  }

  async initialize() {
    console.log("🕛 Initializing Scheduled Winner Selection System...");
    console.log("📅 Daily winners: 12pm PST every day");
    console.log("📅 Weekly winners: 12pm PST every Monday");
    
    // Check for required environment variables
    if (!process.env.BASE_RPC_URL) {
      throw new Error("BASE_RPC_URL environment variable is required");
    }
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }
    
    this.provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    this.signer = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    
    // VRF Contract ABI
    const vrfABI = [
      "function requestDailyRandomness(uint256 gameId, address[] calldata eligiblePlayers) external returns (uint256 requestId)",
      "function requestWeeklyRandomness(uint256 gameId, address[] calldata eligiblePlayers) external returns (uint256 requestId)",
      "function getRequest(uint256 requestId) external view returns (tuple(uint256 gameId, string gameType, bool fulfilled, uint256[] randomWords, address[] eligiblePlayers))",
      "function isRequestFulfilled(uint256 requestId) external view returns (bool)",
      "function getVRFConfig() external view returns (address, uint64, bytes32, uint32, uint16, uint32)",
      "event WinnersSelected(uint256 indexed gameId, string gameType, address[] winners, uint256[] randomWords)",
      "event RandomnessRequested(uint256 indexed requestId, uint256 indexed gameId, string gameType)"
    ];
    
    // Pizza Party Contract ABI (simplified for actual deployed contract)
    const pizzaPartyABI = [
      "function getDailyPlayers(uint256 gameId) external view returns (address[] memory)",
      "function getWeeklyPlayers(uint256 gameId) external view returns (address[] memory)",
      "function getDailyJackpot() external view returns (uint256)",
      "function getWeeklyJackpot() external view returns (uint256)",
      "function getPlayerToppings(address player) external view returns (uint256)",
      "function getTotalToppingsClaimed() external view returns (uint256)",
      "function getPlayerVMFBalance(address player) external view returns (uint256)",
      "function getMinimumVMFRequired() external view returns (uint256)",
      "function getCurrentGameId() external view returns (uint256)",
      "function isDailyDrawReady() external view returns (bool)",
      "function isWeeklyDrawReady() external view returns (bool)",
      "function getEligibleDailyPlayers(uint256 gameId) external view returns (address[] memory)",
      "function getEligibleWeeklyPlayers(uint256 gameId) external view returns (address[] memory)"
    ];
    
    // VMF Token Contract ABI
    const vmfTokenABI = [
      "function balanceOf(address account) external view returns (uint256)",
      "function transfer(address to, uint256 amount) external returns (bool)",
      "function decimals() external view returns (uint8)"
    ];
    
    this.vrfContract = new ethers.Contract(this.VRF_ADDRESS, vrfABI, this.signer);
    this.pizzaPartyContract = new ethers.Contract(this.PIZZA_PARTY_ADDRESS, pizzaPartyABI, this.signer);
    this.vmfTokenContract = new ethers.Contract(this.VMF_TOKEN_ADDRESS, vmfTokenABI, this.signer);

    console.log("✅ VRF Contract connected:", this.VRF_ADDRESS);
    console.log("✅ Pizza Party Contract connected:", this.PIZZA_PARTY_ADDRESS);
    console.log("✅ VMF Token Contract connected:", this.VMF_TOKEN_ADDRESS);
    console.log("✅ Provider connected to Base network");
    console.log("✅ Signer address:", this.signer.address);
    
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

  // Convert PST to UTC for scheduling
  getPSTTime() {
    const now = new Date();
    const pstOffset = -8; // PST is UTC-8
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const pstTime = new Date(utcTime + (pstOffset * 3600000));
    return pstTime;
  }

  // Check if daily draw is ready (12pm PST every day)
  async isDailyDrawReady() {
    const pstTime = this.getPSTTime();
    const today = pstTime.toDateString();
    
    // Check if we already did today's draw
    if (this.lastDailyDraw === today) {
      return false;
    }
    
    // Check if it's 12pm PST
    if (pstTime.getHours() === 12 && pstTime.getMinutes() === 0) {
      console.log("📅 Daily draw time reached: 12pm PST");
      return true;
    }
    
    return false;
  }

  // Check if weekly draw is ready (12pm PST every Monday)
  async isWeeklyDrawReady() {
    const pstTime = this.getPSTTime();
    const today = pstTime.toDateString();
    
    // Check if we already did this week's draw
    if (this.lastWeeklyDraw === today) {
      return false;
    }
    
    // Check if it's Monday 12pm PST
    if (pstTime.getDay() === 1 && pstTime.getHours() === 12 && pstTime.getMinutes() === 0) {
      console.log("📅 Weekly draw time reached: Monday 12pm PST");
      return true;
    }
    
    return false;
  }

  async requestDailyWinners(gameId, eligiblePlayers) {
    console.log(`🎲 Requesting daily winners for game ${gameId} at 12pm PST...`);
    console.log(`📋 Eligible players: ${eligiblePlayers.length}`);
    
    try {
      const requestId = await this.vrfContract.requestDailyRandomness(gameId, eligiblePlayers);
      console.log(`✅ Daily VRF request submitted: ${requestId}`);
      
      // Start monitoring this request
      this.monitorRequest(requestId, 'daily', gameId);
      
      // Mark today's draw as completed
      this.lastDailyDraw = this.getPSTTime().toDateString();
      
      return requestId;
    } catch (error) {
      console.error("❌ Daily VRF request failed:", error.message);
      throw error;
    }
  }

  async requestWeeklyWinners(gameId, eligiblePlayers) {
    console.log(`🎲 Requesting weekly winners for game ${gameId} at Monday 12pm PST...`);
    console.log(`📋 Eligible players: ${eligiblePlayers.length}`);
    
    try {
      const requestId = await this.vrfContract.requestWeeklyRandomness(gameId, eligiblePlayers);
      console.log(`✅ Weekly VRF request submitted: ${requestId}`);
      
      // Start monitoring this request
      this.monitorRequest(requestId, 'weekly', gameId);
      
      // Mark this week's draw as completed
      this.lastWeeklyDraw = this.getPSTTime().toDateString();
      
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
    console.log(`💰 Processing jackpot payments for ${gameType} winners...`);
    
    try {
      // Calculate jackpot amounts from real contract data
      const jackpotPerWinner = await this.calculateJackpotAmount(gameId, gameType, winners.length);
      
      console.log(`💸 Jackpot per winner: ${ethers.formatEther(jackpotPerWinner)} VMF`);
      
      // Process each winner
      for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];
        if (winner !== ethers.ZeroAddress) {
          console.log(`🏆 Winner ${i + 1}: ${winner}`);
          
          // Send jackpot payment to winner's wallet
          await this.sendJackpotPayment(winner, jackpotPerWinner, gameType, gameId);
        }
      }
      
      // Log the complete winner selection
      await this.logWinnerSelection(gameId, gameType, winners, randomWords, jackpotPerWinner);
      
      console.log(`✅ Jackpot payments complete for ${gameType} game ${gameId}`);
      
    } catch (error) {
      console.error(`❌ Error processing winners:`, error.message);
    }
  }

  async calculateJackpotAmount(gameId, gameType, winnerCount) {
    try {
      if (gameType === 'daily') {
        // Get daily jackpot from contract
        const dailyJackpot = await this.pizzaPartyContract.getDailyJackpot();
        console.log(`💰 Daily jackpot from contract: ${ethers.formatEther(dailyJackpot)} VMF`);
        return dailyJackpot / BigInt(winnerCount);
      } else {
        // Get weekly jackpot from contract (total toppings claimed)
        const weeklyJackpot = await this.pizzaPartyContract.getWeeklyJackpot();
        console.log(`💰 Weekly jackpot from contract: ${ethers.formatEther(weeklyJackpot)} VMF`);
        return weeklyJackpot / BigInt(winnerCount);
      }
    } catch (error) {
      console.error("❌ Error getting jackpot from contract:", error.message);
      // Fallback to default amounts
      if (gameType === 'daily') {
        const dailyJackpot = ethers.parseEther("1000"); // 1000 VMF daily jackpot
        return dailyJackpot / BigInt(winnerCount);
      } else {
        const weeklyJackpot = ethers.parseEther("5000"); // 5000 VMF weekly jackpot
        return weeklyJackpot / BigInt(winnerCount);
      }
    }
  }

  async sendJackpotPayment(winner, amount, gameType, gameId) {
    try {
      console.log(`💸 Sending ${ethers.formatEther(amount)} VMF jackpot to ${winner}`);
      
      // Send VMF payment to winner's wallet
      const tx = await this.vmfTokenContract.transfer(winner, amount);
      
      console.log(`✅ Jackpot payment sent! Transaction: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`✅ Payment confirmed in block ${receipt.blockNumber}`);
      
      // Log the payment
      await this.logPayment(winner, amount, gameType, gameId, tx.hash);
      
    } catch (error) {
      console.error(`❌ Error sending jackpot payment to ${winner}:`, error.message);
      throw error;
    }
  }

  async logPayment(winner, amount, gameType, gameId, txHash) {
    const paymentLog = {
      timestamp: new Date().toISOString(),
      winner: winner,
      amount: ethers.formatEther(amount),
      gameType: gameType,
      gameId: gameId.toString(),
      transactionHash: txHash,
      status: 'completed',
      token: 'VMF'
    };
    
    // Save to file
    const fs = require('fs');
    const logFile = 'jackpot-payments.json';
    
    let payments = [];
    if (fs.existsSync(logFile)) {
      payments = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    
    payments.push(paymentLog);
    fs.writeFileSync(logFile, JSON.stringify(payments, null, 2));
    
    console.log(`📝 Jackpot payment logged to ${logFile}`);
  }

  async logWinnerSelection(gameId, gameType, winners, randomWords, jackpotPerWinner) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      gameId: gameId.toString(),
      gameType: gameType,
      winners: winners,
      randomWords: randomWords.map(w => w.toString()),
      jackpotPerWinner: ethers.formatEther(jackpotPerWinner),
      totalWinners: winners.length,
      drawTime: "12pm PST",
      drawDay: gameType === 'weekly' ? 'Monday' : 'Daily',
      token: 'VMF'
    };
    
    // Save to file
    const fs = require('fs');
    const logFile = 'scheduled-winner-selections.json';
    
    let logs = [];
    if (fs.existsSync(logFile)) {
      logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
    }
    
    logs.push(logEntry);
    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
    
    console.log(`📝 Winner selection logged to ${logFile}`);
  }

  async getEligiblePlayers(gameId, gameType) {
    console.log(`🔍 Getting eligible players for ${gameType} game ${gameId} from contract...`);
    
    try {
      if (gameType === 'daily') {
        // Get daily players from contract
        const dailyPlayers = await this.pizzaPartyContract.getEligibleDailyPlayers(gameId);
        console.log(`📋 Found ${dailyPlayers.length} eligible daily players from contract`);
        return dailyPlayers;
      } else {
        // Get weekly players from contract
        const weeklyPlayers = await this.pizzaPartyContract.getEligibleWeeklyPlayers(gameId);
        console.log(`📋 Found ${weeklyPlayers.length} eligible weekly players from contract`);
        return weeklyPlayers;
      }
    } catch (error) {
      console.error("❌ Error getting players from contract:", error.message);
      return [];
    }
  }

  async getGameStats() {
    try {
      const currentGameId = await this.pizzaPartyContract.getCurrentGameId();
      const dailyJackpot = await this.pizzaPartyContract.getDailyJackpot();
      const weeklyJackpot = await this.pizzaPartyContract.getWeeklyJackpot();
      const totalToppingsClaimed = await this.pizzaPartyContract.getTotalToppingsClaimed();
      
      console.log("\n📊 Current Game Stats:");
      console.log(`🎮 Current Game ID: ${currentGameId}`);
      console.log(`💰 Daily Jackpot: ${ethers.formatEther(dailyJackpot)} VMF`);
      console.log(`💰 Weekly Jackpot: ${ethers.formatEther(weeklyJackpot)} VMF`);
      console.log(`🍕 Total Toppings Claimed: ${ethers.formatEther(totalToppingsClaimed)} VMF`);
      
      return {
        currentGameId,
        dailyJackpot,
        weeklyJackpot,
        totalToppingsClaimed
      };
    } catch (error) {
      console.error("❌ Error getting game stats:", error.message);
      return null;
    }
  }

  async startScheduledSelection() {
    if (this.isRunning) {
      console.log("⚠️ Scheduled selection already running");
      return;
    }
    
    this.isRunning = true;
    console.log("🕛 Starting scheduled winner selection system...");
    console.log("📅 Daily winners: 12pm PST every day");
    console.log("📅 Weekly winners: 12pm PST every Monday");
    
    // Get initial game stats
    await this.getGameStats();
    
    // Run the scheduled process
    this.runScheduledProcess();
  }

  async runScheduledProcess() {
    while (this.isRunning) {
      try {
        const pstTime = this.getPSTTime();
        console.log(`\n🕛 Current PST time: ${pstTime.toLocaleString()}`);
        
        // Check if daily draw is ready (12pm PST every day)
        if (await this.isDailyDrawReady()) {
          console.log("📅 Daily draw time reached! Selecting winners...");
          const eligiblePlayers = await this.getEligiblePlayers(this.currentGameId, 'daily');
          
          if (eligiblePlayers.length > 0) {
            await this.requestDailyWinners(this.currentGameId, eligiblePlayers);
          } else {
            console.log("⚠️ No eligible players for daily draw");
          }
        }
        
        // Check if weekly draw is ready (12pm PST every Monday)
        if (await this.isWeeklyDrawReady()) {
          console.log("📅 Weekly draw time reached! Selecting winners...");
          const eligiblePlayers = await this.getEligiblePlayers(this.currentGameId, 'weekly');
          
          if (eligiblePlayers.length > 0) {
            await this.requestWeeklyWinners(this.currentGameId, eligiblePlayers);
          } else {
            console.log("⚠️ No eligible players for weekly draw");
          }
        }
        
        // Wait 1 minute before next check
        console.log("⏳ Waiting 1 minute before next check...");
        await new Promise(resolve => setTimeout(resolve, 60 * 1000));
        
      } catch (error) {
        console.error("❌ Error in scheduled process:", error.message);
        // Wait 5 minutes before retrying
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
      }
    }
  }

  stop() {
    console.log("🛑 Stopping scheduled winner selection system...");
    this.isRunning = false;
  }

  getStatus() {
    const pstTime = this.getPSTTime();
    return {
      isRunning: this.isRunning,
      currentPSTTime: pstTime.toLocaleString(),
      lastDailyDraw: this.lastDailyDraw,
      lastWeeklyDraw: this.lastWeeklyDraw,
      pendingRequests: this.pendingRequests.size,
      vrfContract: this.VRF_ADDRESS,
      pizzaPartyContract: this.PIZZA_PARTY_ADDRESS,
      vmfTokenContract: this.VMF_TOKEN_ADDRESS,
      currentGameId: this.currentGameId,
      nextDailyDraw: "12pm PST tomorrow",
      nextWeeklyDraw: "12pm PST next Monday"
    };
  }
}

// Main execution
async function main() {
  console.log("🕛 Starting Scheduled VRF Winner Selection System...");
  console.log("📅 Daily winners: 12pm PST every day");
  console.log("📅 Weekly winners: 12pm PST every Monday");
  
  const scheduledSystem = new ScheduledWinnerSelection();
  
  try {
    await scheduledSystem.initialize();
    
    // Start the scheduled system
    await scheduledSystem.startScheduledSelection();
    
  } catch (error) {
    console.error("❌ Scheduled system failed:", error);
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

module.exports = ScheduledWinnerSelection;
