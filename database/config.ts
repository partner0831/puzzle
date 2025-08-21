import { Pool, PoolConfig } from 'pg';

// Database configuration
const dbConfig: PoolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'pizza_party',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Test database connection
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connected successfully:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Database types
export interface User {
  id: string;
  wallet_address: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  created_at: Date;
  updated_at: Date;
  last_active_at: Date;
  is_active: boolean;
}

export interface PlayerStats {
  id: string;
  wallet_address: string;
  total_toppings: number;
  daily_entries: number;
  weekly_entries: number;
  referrals_count: number;
  vmf_balance: string;
  last_entry_time?: Date;
  last_vmf_check_time?: Date;
  is_blacklisted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface GameEvent {
  id: string;
  event_type: string;
  block_number: number;
  transaction_hash: string;
  log_index: number;
  player_address?: string;
  game_id?: number;
  amount?: string;
  toppings_earned?: number;
  referrer_address?: string;
  event_data?: any;
  processed_at: Date;
}

export interface LeaderboardEntry {
  rank: number;
  wallet_address: string;
  username?: string;
  avatar_url?: string;
  total_toppings: number;
  entries_count: number;
  referrals_count: number;
  vmf_balance: string;
  last_updated: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_url?: string;
  criteria: any;
  created_at: Date;
}

export interface UserAchievement {
  id: string;
  wallet_address: string;
  achievement_id: string;
  earned_at: Date;
}

// Database utility functions
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📊 Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Query error:', error);
    throw error;
  }
}

export async function getClient() {
  return await pool.connect();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Closing database pool...');
  await pool.end();
  process.exit(0);
});
