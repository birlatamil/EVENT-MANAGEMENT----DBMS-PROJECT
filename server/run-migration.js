const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const baseSchema = fs.readFileSync('./sql/schema.sql', 'utf8');
    console.log('Running base schema.sql...');
    await pool.query(baseSchema);
    
    const featureMigrations = fs.readFileSync('./migration.sql', 'utf8');
    console.log('Running feature migration.sql...');
    await pool.query(featureMigrations);
    
    console.log('✅ Entire database setup completed successfully!');
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
