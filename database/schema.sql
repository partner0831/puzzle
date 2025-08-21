-- Pizza Party Database Schema
-- PostgreSQL database for caching game data and user profiles

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for profiles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Game events table for blockchain event tracking
CREATE TABLE game_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    block_number BIGINT NOT NULL,
    transaction_hash VARCHAR(66) NOT NULL,
    log_index INTEGER NOT NULL,
    player_address VARCHAR(42),
    game_id INTEGER,
    amount NUMERIC(78, 0), -- For large numbers like wei amounts
    toppings_earned INTEGER,
    referrer_address VARCHAR(42),
    event_data JSONB,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transaction_hash, log_index)
);

-- Player stats table (cached from blockchain)
CREATE TABLE player_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    total_toppings INTEGER DEFAULT 0,
    daily_entries INTEGER DEFAULT 0,
    weekly_entries INTEGER DEFAULT 0,
    referrals_count INTEGER DEFAULT 0,
    vmf_balance NUMERIC(78, 0) DEFAULT 0,
    last_entry_time TIMESTAMP WITH TIME ZONE,
    last_vmf_check_time TIMESTAMP WITH TIME ZONE,
    is_blacklisted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id INTEGER NOT NULL,
    game_type VARCHAR(20) NOT NULL, -- 'daily' or 'weekly'
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    total_players INTEGER DEFAULT 0,
    total_toppings INTEGER DEFAULT 0,
    jackpot_amount NUMERIC(78, 0) DEFAULT 0,
    winners_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player game entries table
CREATE TABLE player_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) NOT NULL,
    game_id INTEGER NOT NULL,
    game_type VARCHAR(20) NOT NULL, -- 'daily' or 'weekly'
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    toppings_earned INTEGER DEFAULT 0,
    referrer_address VARCHAR(42),
    transaction_hash VARCHAR(66),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Leaderboard cache table
CREATE TABLE leaderboard_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leaderboard_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'all_time'
    rank INTEGER NOT NULL,
    wallet_address VARCHAR(42) NOT NULL,
    username VARCHAR(50),
    avatar_url TEXT,
    total_toppings INTEGER DEFAULT 0,
    entries_count INTEGER DEFAULT 0,
    referrals_count INTEGER DEFAULT 0,
    vmf_balance NUMERIC(78, 0) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(leaderboard_type, rank)
);

-- Referral relationships table
CREATE TABLE referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_address VARCHAR(42) NOT NULL,
    referred_address VARCHAR(42) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(referrer_address, referred_address)
);

-- Achievement system table
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    criteria JSONB NOT NULL, -- e.g., {"type": "toppings", "amount": 100}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements table
CREATE TABLE user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address VARCHAR(42) NOT NULL,
    achievement_id UUID NOT NULL REFERENCES achievements(id),
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(wallet_address, achievement_id)
);

-- Indexes for performance
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_game_events_type ON game_events(event_type);
CREATE INDEX idx_game_events_player ON game_events(player_address);
CREATE INDEX idx_game_events_block ON game_events(block_number);
CREATE INDEX idx_player_stats_wallet ON player_stats(wallet_address);
CREATE INDEX idx_player_stats_toppings ON player_stats(total_toppings DESC);
CREATE INDEX idx_game_sessions_type ON game_sessions(game_type);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_player_entries_wallet ON player_entries(wallet_address);
CREATE INDEX idx_player_entries_game ON player_entries(game_id);
CREATE INDEX idx_leaderboard_cache_type ON leaderboard_cache(leaderboard_type);
CREATE INDEX idx_leaderboard_cache_rank ON leaderboard_cache(rank);
CREATE INDEX idx_referrals_referrer ON referrals(referrer_address);
CREATE INDEX idx_referrals_referred ON referrals(referred_address);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_stats_updated_at BEFORE UPDATE ON player_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default achievements
INSERT INTO achievements (name, description, icon_url, criteria) VALUES
('First Entry', 'Enter your first daily game', '/achievements/first-entry.png', '{"type": "entries", "count": 1}'),
('Week Warrior', 'Play 7 days in a row', '/achievements/week-warrior.png', '{"type": "streak", "days": 7}'),
('Topping Master', 'Earn 100 total toppings', '/achievements/topping-master.png', '{"type": "toppings", "amount": 100}'),
('Referral King', 'Successfully refer 3 players', '/achievements/referral-king.png', '{"type": "referrals", "count": 3}'),
('Jackpot Winner', 'Win a daily or weekly jackpot', '/achievements/jackpot-winner.png', '{"type": "jackpot_winner"}'),
('VMF Holder', 'Hold 100+ VMF tokens', '/achievements/vmf-holder.png', '{"type": "vmf_balance", "amount": 100}'),
('Daily Champion', 'Win 3 daily jackpots', '/achievements/daily-champion.png', '{"type": "daily_wins", "count": 3}'),
('Weekly Legend', 'Win a weekly jackpot', '/achievements/weekly-legend.png', '{"type": "weekly_winner"}');

-- Views for common queries
CREATE VIEW daily_leaderboard AS
SELECT 
    ps.wallet_address,
    u.username,
    u.avatar_url,
    ps.total_toppings,
    ps.daily_entries,
    ps.referrals_count,
    ps.vmf_balance,
    ROW_NUMBER() OVER (ORDER BY ps.total_toppings DESC, ps.daily_entries DESC) as rank
FROM player_stats ps
LEFT JOIN users u ON ps.wallet_address = u.wallet_address
WHERE ps.is_blacklisted = false
ORDER BY ps.total_toppings DESC, ps.daily_entries DESC;

CREATE VIEW weekly_leaderboard AS
SELECT 
    ps.wallet_address,
    u.username,
    u.avatar_url,
    ps.total_toppings,
    ps.weekly_entries,
    ps.referrals_count,
    ps.vmf_balance,
    ROW_NUMBER() OVER (ORDER BY ps.total_toppings DESC, ps.weekly_entries DESC) as rank
FROM player_stats ps
LEFT JOIN users u ON ps.wallet_address = u.wallet_address
WHERE ps.is_blacklisted = false
ORDER BY ps.total_toppings DESC, ps.weekly_entries DESC;
