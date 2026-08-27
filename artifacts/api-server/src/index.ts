import app from "./app";
import { logger } from "./lib/logger";
import { db, pool, usersTable, departmentsTable, ALL_COLLEGE_DEPARTMENTS } from "@workspace/db";
import { count, eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        role VARCHAR(50) NOT NULL,
        action VARCHAR(255) NOT NULL,
        details JSON,
        ip_address VARCHAR(45),
        device VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        leave_id INT,
        channel ENUM('email', 'sms', 'whatsapp') NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        status ENUM('pending', 'sent', 'failed') NOT NULL,
        error_message TEXT,
        sent_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hostel_blocks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        gender_type ENUM('boys', 'girls', 'coed') NOT NULL DEFAULT 'boys',
        total_rooms INT NOT NULL DEFAULT 50,
        total_capacity INT NOT NULL DEFAULT 200,
        warden_id INT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS gate_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        action_type ENUM('ENTRY', 'EXIT') NOT NULL,
        verification_method ENUM('FACE', 'QR', 'MANUAL') NOT NULL DEFAULT 'FACE',
        confidence_score INT DEFAULT 95,
        security_user_id INT,
        leave_id INT,
        gate_name VARCHAR(100) DEFAULT 'Main Gate 1',
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS location_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL,
        status ENUM('Hostel', 'Left Hostel', 'On the Way', 'At Destination', 'Reached', 'Location Unavailable') NOT NULL DEFAULT 'Hostel',
        latitude VARCHAR(50),
        longitude VARCHAR(50),
        battery_level INT DEFAULT 100,
        is_low_battery_alert_sent ENUM('true', 'false') DEFAULT 'false',
        notes TEXT,
        timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    try { await pool.query(`ALTER TABLE leaves ADD COLUMN risk_score INT DEFAULT 0;`); } catch(e) {}
    try { await pool.query(`ALTER TABLE leaves ADD COLUMN risk_level ENUM('low', 'medium', 'high') DEFAULT 'low';`); } catch(e) {}
    try { await pool.query(`ALTER TABLE leaves ADD COLUMN ai_validation_notes TEXT;`); } catch(e) {}
    try { await pool.query(`ALTER TABLE leaves ADD COLUMN medical_doc_url TEXT;`); } catch(e) {}
    try { await pool.query(`ALTER TABLE leaves ADD COLUMN fraud_status ENUM('genuine', 'suspicious', 'manual_review') DEFAULT 'genuine';`); } catch(e) {}
    try { await pool.query(`ALTER TABLE leaves ADD COLUMN fraud_notes TEXT;`); } catch(e) {}
    try { await pool.query(`ALTER TABLE leaves ADD COLUMN is_emergency ENUM('true', 'false') DEFAULT 'false';`); } catch(e) {}
    
    try { await pool.query(`ALTER TABLE users ADD COLUMN is_face_enrolled ENUM('true', 'false') DEFAULT 'false';`); } catch(e) {}
    try { await pool.query(`ALTER TABLE users ADD COLUMN face_embedding TEXT;`); } catch(e) {}
    try { await pool.query(`ALTER TABLE users ADD COLUMN id_card_url TEXT;`); } catch(e) {}
    try { await pool.query(`ALTER TABLE users ADD COLUMN attendance_percentage INT DEFAULT 87;`); } catch(e) {}
    try { await pool.query(`ALTER TABLE users ADD COLUMN college_type VARCHAR(100) DEFAULT 'Engineering';`); } catch(e) {}
    try { await pool.query(`ALTER TABLE gate_logs ADD COLUMN captured_live_photo TEXT;`); } catch(e) {}
    try { await pool.query(`CREATE INDEX idx_users_register_number ON users (register_number);`); } catch(e) {}
    try { await pool.query(`UPDATE users SET photo_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', is_face_enrolled = 'true' WHERE photo_url IS NULL OR photo_url = '';`); } catch(e) {}
    try { await pool.query(`UPDATE users SET department_id = 1, hostel_block = 'Boys Hostel - A Block', hostel_room = 'A-101', parent_name = 'Robert Doe', parent_phone = '0987654321', phone = '1234567890' WHERE register_number = 'STU001' AND (department_id IS NULL OR hostel_block IS NULL);`); } catch(e) {}

    logger.info("Missing tables, gate logs, location logs, and schema columns initialized.");

    // Seed missing departments into departmentsTable
    const existingDeptList = await db.select().from(departmentsTable);
    const existingCodes = new Set(existingDeptList.map((d) => d.code));
    const toInsert = ALL_COLLEGE_DEPARTMENTS.filter((d) => !existingCodes.has(d.code));

    if (toInsert.length > 0) {
      logger.info({ count: toInsert.length }, "Seeding new multi-institution departments...");
      for (const dept of toInsert) {
        await db.insert(departmentsTable).values({
          code: dept.code,
          name: dept.name,
        });
      }
      logger.info("All departments seeded successfully!");
    }
  } catch (err) {
    logger.error({ err }, "Error initializing missing tables/departments");
  }
}

import { populateRealisticTestData } from "./lib/seed_service";

async function seedDatabase() {
  try {
    await initDatabase();
    
    // Check if real student VIMAL M exists; if not, seed realistic dataset
    const [vimal] = await db.select().from(usersTable).where(eq(usersTable.registerNumber, "731225ME029"));
    if (!vimal) {
      logger.info("Seeding 20 realistic student profiles + JKKM ID cards + multi-stage workflows...");
      await populateRealisticTestData();
      logger.info("Realistic dataset seeded successfully!");
    } else {
      logger.info("Realistic student dataset already present in database.");
    }
  } catch (err) {
    logger.error({ err }, "Error checking/seeding database");
  }
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  await seedDatabase();
});
