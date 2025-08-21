require('dotenv').config();
const { blockchainListener } = require('../services/blockchain-listener');
const { testConnection } = require('../database/config');

async function startListener() {
  console.log('🎧 Starting Pizza Party Blockchain Listener');
  console.log('🌐 Environment:', process.env.NODE_ENV || 'development');

  try {
    // Test database connection
    console.log('\n🔍 Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Start blockchain listener
    console.log('\n🎧 Starting blockchain event listener...');
    await blockchainListener.startListening();

    console.log('\n✅ Blockchain listener started successfully!');
    console.log('\n📋 Listening for events:');
    console.log('  - PlayerEntered');
    console.log('  - JackpotUpdated');
    console.log('  - ToppingsAwarded');
    console.log('  - DailyWinnersSelected');
    console.log('  - WeeklyWinnersSelected');
    console.log('  - PlayerBlacklisted');
    console.log('  - ReferralRegistered');

    console.log('\n🔄 The listener will now:');
    console.log('  - Monitor blockchain events in real-time');
    console.log('  - Sync events to the database');
    console.log('  - Update player stats automatically');
    console.log('  - Keep leaderboards up-to-date');

    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down blockchain listener...');
      await blockchainListener.stopListening();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down blockchain listener...');
      await blockchainListener.stopListening();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start blockchain listener:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  startListener();
}

module.exports = { startListener };
