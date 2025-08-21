require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🗄️ Setting up Pizza Party Database');
  console.log('🌐 Environment:', process.env.NODE_ENV || 'development');

  // Database configuration
  const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'pizza_party',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  };

  console.log('\n📋 Database Configuration:');
  console.log('Host:', dbConfig.host);
  console.log('Port:', dbConfig.port);
  console.log('Database:', dbConfig.database);
  console.log('User:', dbConfig.user);

  try {
    // Create connection pool
    const pool = new Pool(dbConfig);

    // Test connection
    console.log('\n🔍 Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connected successfully:', result.rows[0]);

    // Read and execute schema
    console.log('\n📖 Reading database schema...');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('🔧 Executing database schema...');
    await pool.query(schema);
    console.log('✅ Database schema executed successfully');

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('📋 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Test some basic queries
    console.log('\n🧪 Testing basic queries...');
    
    // Test users table
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    console.log(`✅ Users table: ${usersResult.rows[0].count} records`);

    // Test achievements table
    const achievementsResult = await pool.query('SELECT COUNT(*) as count FROM achievements');
    console.log(`✅ Achievements table: ${achievementsResult.rows[0].count} records`);

    // Test player_stats table
    const statsResult = await pool.query('SELECT COUNT(*) as count FROM player_stats');
    console.log(`✅ Player stats table: ${statsResult.rows[0].count} records`);

    // Test leaderboard views
    console.log('\n🏆 Testing leaderboard views...');
    const dailyLeaderboardResult = await pool.query('SELECT COUNT(*) as count FROM daily_leaderboard');
    console.log(`✅ Daily leaderboard view: ${dailyLeaderboardResult.rows[0].count} records`);

    const weeklyLeaderboardResult = await pool.query('SELECT COUNT(*) as count FROM weekly_leaderboard');
    console.log(`✅ Weekly leaderboard view: ${weeklyLeaderboardResult.rows[0].count} records`);

    // Close connection
    await pool.end();

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start the blockchain event listener');
    console.log('2. Configure environment variables for production');
    console.log('3. Set up database backups');
    console.log('4. Test the API endpoints');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting:');
      console.log('- Make sure PostgreSQL is running');
      console.log('- Check your database connection settings');
      console.log('- Verify the database exists');
    }
    
    if (error.code === '3D000') {
      console.log('\n💡 Database does not exist. Create it first:');
      console.log('createdb pizza_party');
    }

    process.exit(1);
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase };
