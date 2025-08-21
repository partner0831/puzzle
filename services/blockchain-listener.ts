import { ethers } from 'ethers';
import { query, getClient } from '../database/config';
import { CONTRACT_ADDRESSES } from '../lib/contract-config';

export class BlockchainListener {
  private provider: ethers.Provider;
  private contract: ethers.Contract;
  private isListening: boolean = false;
  private lastProcessedBlock: number = 0;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || 'https://mainnet.base.org');
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESSES.PIZZA_PARTY_CORE,
      [
        'event PlayerEntered(address indexed player, uint256 indexed gameId, uint256 amount)',
        'event JackpotUpdated(uint256 dailyJackpot, uint256 weeklyJackpot)',
        'event ToppingsAwarded(address indexed player, uint256 amount, string reason)',
        'event DailyWinnersSelected(uint256 gameId, address[] winners, uint256 jackpot)',
        'event WeeklyWinnersSelected(uint256 gameId, address[] winners, uint256 jackpot)',
        'event PlayerBlacklisted(address indexed player, bool blacklisted)',
        'event ReferralRegistered(address indexed referrer, address indexed referred)'
      ],
      this.provider
    );
  }

  /**
   * Start listening to blockchain events
   */
  async startListening() {
    if (this.isListening) {
      console.log('⚠️ Already listening to blockchain events');
      return;
    }

    console.log('🎧 Starting blockchain event listener...');
    this.isListening = true;

    // Get the last processed block from database
    await this.loadLastProcessedBlock();

    // Start listening to events
    this.contract.on('PlayerEntered', this.handlePlayerEntered.bind(this));
    this.contract.on('JackpotUpdated', this.handleJackpotUpdated.bind(this));
    this.contract.on('ToppingsAwarded', this.handleToppingsAwarded.bind(this));
    this.contract.on('DailyWinnersSelected', this.handleDailyWinnersSelected.bind(this));
    this.contract.on('WeeklyWinnersSelected', this.handleWeeklyWinnersSelected.bind(this));
    this.contract.on('PlayerBlacklisted', this.handlePlayerBlacklisted.bind(this));
    this.contract.on('ReferralRegistered', this.handleReferralRegistered.bind(this));

    // Start polling for missed events
    this.startPolling();

    console.log('✅ Blockchain event listener started');
  }

  /**
   * Stop listening to blockchain events
   */
  async stopListening() {
    if (!this.isListening) {
      console.log('⚠️ Not currently listening to blockchain events');
      return;
    }

    console.log('🛑 Stopping blockchain event listener...');
    this.isListening = false;

    // Remove all event listeners
    this.contract.removeAllListeners();

    console.log('✅ Blockchain event listener stopped');
  }

  /**
   * Load the last processed block from database
   */
  private async loadLastProcessedBlock() {
    try {
      const result = await query(
        'SELECT MAX(block_number) as last_block FROM game_events'
      );
      this.lastProcessedBlock = result.rows[0]?.last_block || 0;
      console.log(`📦 Last processed block: ${this.lastProcessedBlock}`);
    } catch (error) {
      console.error('❌ Failed to load last processed block:', error);
      this.lastProcessedBlock = 0;
    }
  }

  /**
   * Start polling for missed events
   */
  private startPolling() {
    setInterval(async () => {
      if (!this.isListening) return;
      
      try {
        await this.processMissedEvents();
      } catch (error) {
        console.error('❌ Error processing missed events:', error);
      }
    }, 30000); // Poll every 30 seconds
  }

  /**
   * Process any missed events
   */
  private async processMissedEvents() {
    const currentBlock = await this.provider.getBlockNumber();
    
    if (currentBlock <= this.lastProcessedBlock) return;

    console.log(`🔍 Processing blocks ${this.lastProcessedBlock + 1} to ${currentBlock}`);

    // Get events from the last processed block to current
    const events = await this.contract.queryFilter({}, this.lastProcessedBlock + 1, currentBlock);
    
    for (const event of events) {
      await this.processEvent(event);
    }

    this.lastProcessedBlock = currentBlock;
  }

  /**
   * Process a single event
   */
  private async processEvent(event: ethers.EventLog) {
    try {
      const eventData = {
        event_type: event.eventName,
        block_number: event.blockNumber,
        transaction_hash: event.transactionHash,
        log_index: event.logIndex,
        event_data: event.args
      };

      // Insert event into database
      await query(
        `INSERT INTO game_events (event_type, block_number, transaction_hash, log_index, event_data)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (transaction_hash, log_index) DO NOTHING`,
        [eventData.event_type, eventData.block_number, eventData.transaction_hash, eventData.log_index, JSON.stringify(eventData.event_data)]
      );

      console.log(`✅ Processed event: ${eventData.event_type} at block ${eventData.block_number}`);
    } catch (error) {
      console.error('❌ Error processing event:', error);
    }
  }

  /**
   * Handle PlayerEntered event
   */
  private async handlePlayerEntered(player: string, gameId: ethers.BigNumberish, amount: ethers.BigNumberish) {
    try {
      console.log(`🎮 Player entered: ${player}, game: ${gameId}, amount: ${amount}`);

      // Insert player entry
      await query(
        `INSERT INTO player_entries (wallet_address, game_id, game_type, entry_time, transaction_hash)
         VALUES ($1, $2, 'daily', NOW(), $3)`,
        [player, gameId.toString(), 'pending'] // transaction hash will be updated later
      );

      // Update player stats
      await this.updatePlayerStats(player);

    } catch (error) {
      console.error('❌ Error handling PlayerEntered:', error);
    }
  }

  /**
   * Handle JackpotUpdated event
   */
  private async handleJackpotUpdated(dailyJackpot: ethers.BigNumberish, weeklyJackpot: ethers.BigNumberish) {
    try {
      console.log(`💰 Jackpot updated: daily=${dailyJackpot}, weekly=${weeklyJackpot}`);

      // Update current game session
      await query(
        `UPDATE game_sessions 
         SET jackpot_amount = $1, updated_at = NOW()
         WHERE game_type = 'daily' AND status = 'active'`,
        [dailyJackpot.toString()]
      );

    } catch (error) {
      console.error('❌ Error handling JackpotUpdated:', error);
    }
  }

  /**
   * Handle ToppingsAwarded event
   */
  private async handleToppingsAwarded(player: string, amount: ethers.BigNumberish, reason: string) {
    try {
      console.log(`🍕 Toppings awarded: ${player}, amount: ${amount}, reason: ${reason}`);

      // Update player stats
      await query(
        `UPDATE player_stats 
         SET total_toppings = total_toppings + $1, updated_at = NOW()
         WHERE wallet_address = $2`,
        [amount.toString(), player]
      );

    } catch (error) {
      console.error('❌ Error handling ToppingsAwarded:', error);
    }
  }

  /**
   * Handle DailyWinnersSelected event
   */
  private async handleDailyWinnersSelected(gameId: ethers.BigNumberish, winners: string[], jackpot: ethers.BigNumberish) {
    try {
      console.log(`🏆 Daily winners selected: game ${gameId}, winners: ${winners.length}, jackpot: ${jackpot}`);

      // Update game session
      await query(
        `UPDATE game_sessions 
         SET status = 'completed', end_time = NOW(), winners_count = $1, updated_at = NOW()
         WHERE game_id = $2 AND game_type = 'daily'`,
        [winners.length, gameId.toString()]
      );

      // Create new game session
      await query(
        `INSERT INTO game_sessions (game_id, game_type, start_time, status)
         VALUES ($1, 'daily', NOW(), 'active')`,
        [(parseInt(gameId.toString()) + 1).toString()]
      );

    } catch (error) {
      console.error('❌ Error handling DailyWinnersSelected:', error);
    }
  }

  /**
   * Handle WeeklyWinnersSelected event
   */
  private async handleWeeklyWinnersSelected(gameId: ethers.BigNumberish, winners: string[], jackpot: ethers.BigNumberish) {
    try {
      console.log(`🏆 Weekly winners selected: game ${gameId}, winners: ${winners.length}, jackpot: ${jackpot}`);

      // Update game session
      await query(
        `UPDATE game_sessions 
         SET status = 'completed', end_time = NOW(), winners_count = $1, updated_at = NOW()
         WHERE game_id = $2 AND game_type = 'weekly'`,
        [winners.length, gameId.toString()]
      );

      // Create new game session
      await query(
        `INSERT INTO game_sessions (game_id, game_type, start_time, status)
         VALUES ($1, 'weekly', NOW(), 'active')`,
        [(parseInt(gameId.toString()) + 1).toString()]
      );

    } catch (error) {
      console.error('❌ Error handling WeeklyWinnersSelected:', error);
    }
  }

  /**
   * Handle PlayerBlacklisted event
   */
  private async handlePlayerBlacklisted(player: string, blacklisted: boolean) {
    try {
      console.log(`🚫 Player blacklisted: ${player}, blacklisted: ${blacklisted}`);

      // Update player stats
      await query(
        `UPDATE player_stats 
         SET is_blacklisted = $1, updated_at = NOW()
         WHERE wallet_address = $2`,
        [blacklisted, player]
      );

    } catch (error) {
      console.error('❌ Error handling PlayerBlacklisted:', error);
    }
  }

  /**
   * Handle ReferralRegistered event
   */
  private async handleReferralRegistered(referrer: string, referred: string) {
    try {
      console.log(`🔗 Referral registered: ${referrer} referred ${referred}`);

      // Insert referral relationship
      await query(
        `INSERT INTO referrals (referrer_address, referred_address)
         VALUES ($1, $2)
         ON CONFLICT (referrer_address, referred_address) DO NOTHING`,
        [referrer, referred]
      );

      // Update referrer stats
      await query(
        `UPDATE player_stats 
         SET referrals_count = referrals_count + 1, updated_at = NOW()
         WHERE wallet_address = $1`,
        [referrer]
      );

    } catch (error) {
      console.error('❌ Error handling ReferralRegistered:', error);
    }
  }

  /**
   * Update player stats from blockchain
   */
  private async updatePlayerStats(walletAddress: string) {
    try {
      const contract = new ethers.Contract(
        CONTRACT_ADDRESSES.PIZZA_PARTY_CORE,
        [
          'function getPlayerToppings(address) view returns (uint256)',
          'function getPlayerReferralInfo(address) view returns (uint256, address)',
          'function getPlayerVMFBalance(address) view returns (uint256)'
        ],
        this.provider
      );

      const [toppings, referralInfo, vmfBalance] = await Promise.all([
        contract.getPlayerToppings(walletAddress),
        contract.getPlayerReferralInfo(walletAddress),
        contract.getPlayerVMFBalance(walletAddress)
      ]);

      await query(
        `INSERT INTO player_stats (wallet_address, total_toppings, referrals_count, vmf_balance, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (wallet_address) 
         DO UPDATE SET 
           total_toppings = $2,
           referrals_count = $3,
           vmf_balance = $4,
           updated_at = NOW()`,
        [walletAddress, toppings.toString(), referralInfo[0].toString(), vmfBalance.toString()]
      );

    } catch (error) {
      console.error('❌ Error updating player stats:', error);
    }
  }

  /**
   * Sync all player data from blockchain
   */
  async syncAllPlayerData() {
    console.log('🔄 Starting full player data sync...');
    
    try {
      // Get all unique player addresses from events
      const result = await query(
        'SELECT DISTINCT player_address FROM game_events WHERE player_address IS NOT NULL'
      );

      for (const row of result.rows) {
        await this.updatePlayerStats(row.player_address);
      }

      console.log(`✅ Synced data for ${result.rows.length} players`);
    } catch (error) {
      console.error('❌ Error syncing player data:', error);
    }
  }
}

// Export singleton instance
export const blockchainListener = new BlockchainListener();
