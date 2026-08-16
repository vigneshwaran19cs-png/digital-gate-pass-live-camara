import mysql from 'mysql2/promise';

async function sync() {
  const connection = await mysql.createConnection('mysql://root@localhost:3306/hostel_pass_manager');
  console.log('Connected to MySQL...');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      role VARCHAR(50) NOT NULL,
      action VARCHAR(255) NOT NULL,
      details JSON,
      ip_address VARCHAR(45),
      device VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('activity_logs table checked/created.');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      leave_id INT,
      channel ENUM('email', 'sms', 'whatsapp') NOT NULL,
      recipient VARCHAR(255) NOT NULL,
      status ENUM('pending', 'sent', 'failed') NOT NULL,
      error_message TEXT,
      sent_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  console.log('notification_logs table checked/created.');

  const [tables] = await connection.query('SHOW TABLES');
  console.log('Current tables in DB:', tables);

  await connection.end();
}

sync().catch(console.error);
