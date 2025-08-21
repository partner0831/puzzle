import { query, User, PlayerStats } from '../database/config';

export class UserProfileService {
  /**
   * Create or update user profile
   */
  async createOrUpdateProfile(walletAddress: string, profileData: {
    username?: string;
    avatar_url?: string;
    bio?: string;
  }): Promise<User> {
    try {
      const result = await query(
        `INSERT INTO users (wallet_address, username, avatar_url, bio, last_active_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (wallet_address) 
         DO UPDATE SET 
           username = COALESCE($2, users.username),
           avatar_url = COALESCE($3, users.avatar_url),
           bio = COALESCE($4, users.bio),
           last_active_at = NOW(),
           updated_at = NOW()
         RETURNING *`,
        [walletAddress, profileData.username, profileData.avatar_url, profileData.bio]
      );

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating/updating profile:', error);
      throw error;
    }
  }

  /**
   * Get user profile by wallet address
   */
  async getProfile(walletAddress: string): Promise<User | null> {
    try {
      const result = await query(
        'SELECT * FROM users WHERE wallet_address = $1 AND is_active = true',
        [walletAddress]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error getting profile:', error);
      throw error;
    }
  }

  /**
   * Get user profile with stats
   */
  async getProfileWithStats(walletAddress: string): Promise<{
    profile: User | null;
    stats: PlayerStats | null;
  }> {
    try {
      const [profileResult, statsResult] = await Promise.all([
        query('SELECT * FROM users WHERE wallet_address = $1 AND is_active = true', [walletAddress]),
        query('SELECT * FROM player_stats WHERE wallet_address = $1', [walletAddress])
      ]);

      return {
        profile: profileResult.rows[0] || null,
        stats: statsResult.rows[0] || null
      };
    } catch (error) {
      console.error('❌ Error getting profile with stats:', error);
      throw error;
    }
  }

  /**
   * Check if username is available
   */
  async isUsernameAvailable(username: string, excludeWalletAddress?: string): Promise<boolean> {
    try {
      let queryText = 'SELECT COUNT(*) as count FROM users WHERE username = $1';
      let params = [username];

      if (excludeWalletAddress) {
        queryText += ' AND wallet_address != $2';
        params.push(excludeWalletAddress);
      }

      const result = await query(queryText, params);
      return result.rows[0].count === '0';
    } catch (error) {
      console.error('❌ Error checking username availability:', error);
      throw error;
    }
  }

  /**
   * Update user avatar
   */
  async updateAvatar(walletAddress: string, avatarUrl: string): Promise<User> {
    try {
      const result = await query(
        `UPDATE users 
         SET avatar_url = $1, updated_at = NOW()
         WHERE wallet_address = $2
         RETURNING *`,
        [avatarUrl, walletAddress]
      );

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating avatar:', error);
      throw error;
    }
  }

  /**
   * Update user bio
   */
  async updateBio(walletAddress: string, bio: string): Promise<User> {
    try {
      const result = await query(
        `UPDATE users 
         SET bio = $1, updated_at = NOW()
         WHERE wallet_address = $2
         RETURNING *`,
        [bio, walletAddress]
      );

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating bio:', error);
      throw error;
    }
  }

  /**
   * Deactivate user profile
   */
  async deactivateProfile(walletAddress: string): Promise<void> {
    try {
      await query(
        'UPDATE users SET is_active = false, updated_at = NOW() WHERE wallet_address = $1',
        [walletAddress]
      );
    } catch (error) {
      console.error('❌ Error deactivating profile:', error);
      throw error;
    }
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(walletAddress: string): Promise<any[]> {
    try {
      const result = await query(
        `SELECT a.*, ua.earned_at
         FROM user_achievements ua
         JOIN achievements a ON ua.achievement_id = a.id
         WHERE ua.wallet_address = $1
         ORDER BY ua.earned_at DESC`,
        [walletAddress]
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Error getting user achievements:', error);
      throw error;
    }
  }

  /**
   * Award achievement to user
   */
  async awardAchievement(walletAddress: string, achievementId: string): Promise<void> {
    try {
      await query(
        `INSERT INTO user_achievements (wallet_address, achievement_id)
         VALUES ($1, $2)
         ON CONFLICT (wallet_address, achievement_id) DO NOTHING`,
        [walletAddress, achievementId]
      );
    } catch (error) {
      console.error('❌ Error awarding achievement:', error);
      throw error;
    }
  }

  /**
   * Get user referral stats
   */
  async getUserReferrals(walletAddress: string): Promise<{
    referred_count: number;
    referred_users: any[];
  }> {
    try {
      const [countResult, usersResult] = await Promise.all([
        query(
          'SELECT COUNT(*) as count FROM referrals WHERE referrer_address = $1',
          [walletAddress]
        ),
        query(
          `SELECT r.referred_address, u.username, u.avatar_url, r.created_at
           FROM referrals r
           LEFT JOIN users u ON r.referred_address = u.wallet_address
           WHERE r.referrer_address = $1
           ORDER BY r.created_at DESC`,
          [walletAddress]
        )
      ]);

      return {
        referred_count: parseInt(countResult.rows[0].count),
        referred_users: usersResult.rows
      };
    } catch (error) {
      console.error('❌ Error getting user referrals:', error);
      throw error;
    }
  }

  /**
   * Get user game history
   */
  async getUserGameHistory(walletAddress: string, limit: number = 20): Promise<any[]> {
    try {
      const result = await query(
        `SELECT pe.*, gs.game_type, gs.jackpot_amount
         FROM player_entries pe
         LEFT JOIN game_sessions gs ON pe.game_id = gs.game_id
         WHERE pe.wallet_address = $1
         ORDER BY pe.entry_time DESC
         LIMIT $2`,
        [walletAddress, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Error getting user game history:', error);
      throw error;
    }
  }

  /**
   * Search users by username
   */
  async searchUsers(searchTerm: string, limit: number = 10): Promise<User[]> {
    try {
      const result = await query(
        `SELECT * FROM users 
         WHERE username ILIKE $1 AND is_active = true
         ORDER BY last_active_at DESC
         LIMIT $2`,
        [`%${searchTerm}%`, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Error searching users:', error);
      throw error;
    }
  }

  /**
   * Get top users by toppings
   */
  async getTopUsers(limit: number = 10): Promise<any[]> {
    try {
      const result = await query(
        `SELECT u.wallet_address, u.username, u.avatar_url, ps.total_toppings, ps.referrals_count
         FROM player_stats ps
         LEFT JOIN users u ON ps.wallet_address = u.wallet_address
         WHERE ps.is_blacklisted = false
         ORDER BY ps.total_toppings DESC, ps.referrals_count DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('❌ Error getting top users:', error);
      throw error;
    }
  }

  /**
   * Update user last active time
   */
  async updateLastActive(walletAddress: string): Promise<void> {
    try {
      await query(
        'UPDATE users SET last_active_at = NOW() WHERE wallet_address = $1',
        [walletAddress]
      );
    } catch (error) {
      console.error('❌ Error updating last active:', error);
      // Don't throw error for this as it's not critical
    }
  }
}

// Export singleton instance
export const userProfileService = new UserProfileService();
