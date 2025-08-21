import { query, LeaderboardEntry } from '../database/config';

export class LeaderboardService {
  /**
   * Get daily leaderboard
   */
  async getDailyLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
      const result = await query(
        `SELECT 
           ROW_NUMBER() OVER (ORDER BY ps.total_toppings DESC, ps.daily_entries DESC) as rank,
           ps.wallet_address,
           u.username,
           u.avatar_url,
           ps.total_toppings,
           ps.daily_entries as entries_count,
           ps.referrals_count,
           ps.vmf_balance,
           ps.updated_at as last_updated
         FROM player_stats ps
         LEFT JOIN users u ON ps.wallet_address = u.wallet_address
         WHERE ps.is_blacklisted = false
         ORDER BY ps.total_toppings DESC, ps.daily_entries DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Error getting daily leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get weekly leaderboard
   */
  async getWeeklyLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
      const result = await query(
        `SELECT 
           ROW_NUMBER() OVER (ORDER BY ps.total_toppings DESC, ps.weekly_entries DESC) as rank,
           ps.wallet_address,
           u.username,
           u.avatar_url,
           ps.total_toppings,
           ps.weekly_entries as entries_count,
           ps.referrals_count,
           ps.vmf_balance,
           ps.updated_at as last_updated
         FROM player_stats ps
         LEFT JOIN users u ON ps.wallet_address = u.wallet_address
         WHERE ps.is_blacklisted = false
         ORDER BY ps.total_toppings DESC, ps.weekly_entries DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Error getting weekly leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get all-time leaderboard
   */
  async getAllTimeLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
      const result = await query(
        `SELECT 
           ROW_NUMBER() OVER (ORDER BY ps.total_toppings DESC, (ps.daily_entries + ps.weekly_entries) DESC) as rank,
           ps.wallet_address,
           u.username,
           u.avatar_url,
           ps.total_toppings,
           (ps.daily_entries + ps.weekly_entries) as entries_count,
           ps.referrals_count,
           ps.vmf_balance,
           ps.updated_at as last_updated
         FROM player_stats ps
         LEFT JOIN users u ON ps.wallet_address = u.wallet_address
         WHERE ps.is_blacklisted = false
         ORDER BY ps.total_toppings DESC, (ps.daily_entries + ps.weekly_entries) DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Error getting all-time leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get user's rank in daily leaderboard
   */
  async getUserDailyRank(walletAddress: string): Promise<number | null> {
    try {
      const result = await query(
        `SELECT rank FROM (
           SELECT 
             wallet_address,
             ROW_NUMBER() OVER (ORDER BY total_toppings DESC, daily_entries DESC) as rank
           FROM player_stats
           WHERE is_blacklisted = false
         ) ranked
         WHERE wallet_address = $1`,
        [walletAddress]
      );

      return result.rows[0]?.rank || null;
    } catch (error) {
      console.error('❌ Error getting user daily rank:', error);
      throw error;
    }
  }

  /**
   * Get user's rank in weekly leaderboard
   */
  async getUserWeeklyRank(walletAddress: string): Promise<number | null> {
    try {
      const result = await query(
        `SELECT rank FROM (
           SELECT 
             wallet_address,
             ROW_NUMBER() OVER (ORDER BY total_toppings DESC, weekly_entries DESC) as rank
           FROM player_stats
           WHERE is_blacklisted = false
         ) ranked
         WHERE wallet_address = $1`,
        [walletAddress]
      );

      return result.rows[0]?.rank || null;
    } catch (error) {
      console.error('❌ Error getting user weekly rank:', error);
      throw error;
    }
  }

  /**
   * Get user's rank in all-time leaderboard
   */
  async getUserAllTimeRank(walletAddress: string): Promise<number | null> {
    try {
      const result = await query(
        `SELECT rank FROM (
           SELECT 
             wallet_address,
             ROW_NUMBER() OVER (ORDER BY total_toppings DESC, (daily_entries + weekly_entries) DESC) as rank
           FROM player_stats
           WHERE is_blacklisted = false
         ) ranked
         WHERE wallet_address = $1`,
        [walletAddress]
      );

      return result.rows[0]?.rank || null;
    } catch (error) {
      console.error('❌ Error getting user all-time rank:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard around a specific user
   */
  async getLeaderboardAroundUser(walletAddress: string, leaderboardType: 'daily' | 'weekly' | 'all_time', context: number = 5): Promise<LeaderboardEntry[]> {
    try {
      let orderBy: string;
      let entriesField: string;

      switch (leaderboardType) {
        case 'daily':
          orderBy = 'total_toppings DESC, daily_entries DESC';
          entriesField = 'daily_entries';
          break;
        case 'weekly':
          orderBy = 'total_toppings DESC, weekly_entries DESC';
          entriesField = 'weekly_entries';
          break;
        case 'all_time':
          orderBy = 'total_toppings DESC, (daily_entries + weekly_entries) DESC';
          entriesField = '(daily_entries + weekly_entries)';
          break;
      }

      const result = await query(
        `WITH user_rank AS (
           SELECT 
             wallet_address,
             ROW_NUMBER() OVER (ORDER BY ${orderBy}) as rank
           FROM player_stats
           WHERE is_blacklisted = false
         ),
         user_position AS (
           SELECT rank FROM user_rank WHERE wallet_address = $1
         )
         SELECT 
           ur.rank,
           ps.wallet_address,
           u.username,
           u.avatar_url,
           ps.total_toppings,
           ${entriesField} as entries_count,
           ps.referrals_count,
           ps.vmf_balance,
           ps.updated_at as last_updated
         FROM user_rank ur
         JOIN player_stats ps ON ur.wallet_address = ps.wallet_address
         LEFT JOIN users u ON ps.wallet_address = u.wallet_address
         WHERE ur.rank BETWEEN (
           SELECT GREATEST(1, rank - $2) FROM user_position
         ) AND (
           SELECT rank + $2 FROM user_position
         )
         ORDER BY ur.rank`,
        [walletAddress, context]
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Error getting leaderboard around user:', error);
      throw error;
    }
  }

  /**
   * Update leaderboard cache
   */
  async updateLeaderboardCache(leaderboardType: 'daily' | 'weekly' | 'all_time'): Promise<void> {
    try {
      // Clear existing cache for this type
      await query(
        'DELETE FROM leaderboard_cache WHERE leaderboard_type = $1',
        [leaderboardType]
      );

      let entriesField: string;
      let orderBy: string;

      switch (leaderboardType) {
        case 'daily':
          entriesField = 'daily_entries';
          orderBy = 'total_toppings DESC, daily_entries DESC';
          break;
        case 'weekly':
          entriesField = 'weekly_entries';
          orderBy = 'total_toppings DESC, weekly_entries DESC';
          break;
        case 'all_time':
          entriesField = '(daily_entries + weekly_entries)';
          orderBy = 'total_toppings DESC, (daily_entries + weekly_entries) DESC';
          break;
      }

      // Insert new cache entries
      await query(
        `INSERT INTO leaderboard_cache (leaderboard_type, rank, wallet_address, username, avatar_url, total_toppings, entries_count, referrals_count, vmf_balance, last_updated)
         SELECT 
           $1 as leaderboard_type,
           ROW_NUMBER() OVER (ORDER BY ${orderBy}) as rank,
           ps.wallet_address,
           u.username,
           u.avatar_url,
           ps.total_toppings,
           ${entriesField} as entries_count,
           ps.referrals_count,
           ps.vmf_balance,
           NOW() as last_updated
         FROM player_stats ps
         LEFT JOIN users u ON ps.wallet_address = u.wallet_address
         WHERE ps.is_blacklisted = false
         ORDER BY ${orderBy}
         LIMIT 100`,
        [leaderboardType]
      );

      console.log(`✅ Updated ${leaderboardType} leaderboard cache`);
    } catch (error) {
      console.error('❌ Error updating leaderboard cache:', error);
      throw error;
    }
  }

  /**
   * Get cached leaderboard
   */
  async getCachedLeaderboard(leaderboardType: 'daily' | 'weekly' | 'all_time', limit: number = 50): Promise<LeaderboardEntry[]> {
    try {
      const result = await query(
        `SELECT 
           rank,
           wallet_address,
           username,
           avatar_url,
           total_toppings,
           entries_count,
           referrals_count,
           vmf_balance,
           last_updated
         FROM leaderboard_cache
         WHERE leaderboard_type = $1
         ORDER BY rank
         LIMIT $2`,
        [leaderboardType, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Error getting cached leaderboard:', error);
      // Fallback to direct query if cache fails
      switch (leaderboardType) {
        case 'daily':
          return this.getDailyLeaderboard(limit);
        case 'weekly':
          return this.getWeeklyLeaderboard(limit);
        case 'all_time':
          return this.getAllTimeLeaderboard(limit);
      }
    }
  }

  /**
   * Get leaderboard statistics
   */
  async getLeaderboardStats(): Promise<{
    total_players: number;
    total_toppings: number;
    avg_toppings_per_player: number;
    top_player_toppings: number;
  }> {
    try {
      const result = await query(
        `SELECT 
           COUNT(*) as total_players,
           SUM(total_toppings) as total_toppings,
           AVG(total_toppings) as avg_toppings_per_player,
           MAX(total_toppings) as top_player_toppings
         FROM player_stats
         WHERE is_blacklisted = false`
      );

      return {
        total_players: parseInt(result.rows[0].total_players),
        total_toppings: parseInt(result.rows[0].total_toppings),
        avg_toppings_per_player: parseFloat(result.rows[0].avg_toppings_per_player),
        top_player_toppings: parseInt(result.rows[0].top_player_toppings)
      };
    } catch (error) {
      console.error('❌ Error getting leaderboard stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const leaderboardService = new LeaderboardService();
