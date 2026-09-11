import { pool } from '../lib/db/src/index.ts';

async function syncNewColumns() {
  try {
    console.log('Connected to MySQL via lib/db pool...');

    // Add columns to leaves table if they don't exist
    const [leaveCols] = await pool.query('SHOW COLUMNS FROM leaves');
    const existingLeaveCols = leaveCols.map((c) => c.Field);

    if (!existingLeaveCols.includes('from_time')) {
      await pool.query('ALTER TABLE leaves ADD COLUMN from_time VARCHAR(20) NULL AFTER to_date');
      console.log('Added from_time to leaves table.');
    } else {
      console.log('from_time already exists in leaves table.');
    }
    if (!existingLeaveCols.includes('to_time')) {
      await pool.query('ALTER TABLE leaves ADD COLUMN to_time VARCHAR(20) NULL AFTER from_time');
      console.log('Added to_time to leaves table.');
    } else {
      console.log('to_time already exists in leaves table.');
    }
    if (!existingLeaveCols.includes('district')) {
      await pool.query('ALTER TABLE leaves ADD COLUMN district VARCHAR(100) NULL AFTER destination');
      console.log('Added district to leaves table.');
    } else {
      console.log('district already exists in leaves table.');
    }

    // Add columns to users table if they don't exist
    const [userCols] = await pool.query('SHOW COLUMNS FROM users');
    const existingUserCols = userCols.map((c) => c.Field);

    if (!existingUserCols.includes('district')) {
      await pool.query('ALTER TABLE users ADD COLUMN district VARCHAR(100) NULL AFTER address');
      console.log('Added district to users table.');
    } else {
      console.log('district already exists in users table.');
    }
    if (!existingUserCols.includes('outing_destination')) {
      await pool.query('ALTER TABLE users ADD COLUMN outing_destination VARCHAR(255) NULL AFTER district');
      console.log('Added outing_destination to users table.');
    } else {
      console.log('outing_destination already exists in users table.');
    }

    console.log('✅ Database columns synchronization complete!');
  } catch (err) {
    console.error('Error syncing columns:', err.message);
  } finally {
    await pool.end();
  }
}

syncNewColumns();
