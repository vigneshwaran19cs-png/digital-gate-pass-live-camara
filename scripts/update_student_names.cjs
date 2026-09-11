const fs = require('fs');
const path = require('path');
const mysql = require('../node_modules/.pnpm/mysql2@3.22.4_@types+node@25.6.2/node_modules/mysql2/promise');

function parseCandidateData() {
  const tsxPath = path.join(__dirname, '../artifacts/hostel-outpass/src/pages/admin/id-card-upload.tsx');
  const content = fs.readFileSync(tsxPath, 'utf8');

  const regex = /\{\s*name:\s*"([^"]+)",\s*reg:\s*"([^"]+)",\s*barcode:\s*"([^"]+)"/g;

  const map = new Map();
  let match;
  while ((match = regex.exec(content)) !== null) {
    const studentName = match[1].trim();
    const reg = match[2].trim().toUpperCase();
    const barcode = match[3].trim().toUpperCase();

    map.set(reg, studentName);
    map.set(barcode, studentName);
    if (!reg.startsWith("7312")) {
      map.set(`7312${reg}`, studentName);
    }
  }
  return map;
}

async function main() {
  const studentMap = parseCandidateData();
  console.log(`📋 Candidate student name lookup dictionary loaded with ${studentMap.size} entries.`);

  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'hostel_pass_manager'
  });

  console.log('✓ Connected to MySQL database');

  const [users] = await conn.query('SELECT id, name, register_number, barcode FROM users WHERE role = "student"');
  console.log(`Checking ${users.length} student users in database...`);

  let updatedCount = 0;

  for (const u of users) {
    const reg = (u.register_number || "").toUpperCase();
    const bar = (u.barcode || "").toUpperCase();

    const realName = studentMap.get(reg) || studentMap.get(bar) || studentMap.get(reg.replace(/^7312/, ""));

    if (realName && (u.name.startsWith("Student (") || u.name === "Student User" || u.name === "Student")) {
      await conn.query('UPDATE users SET name = ? WHERE id = ?', [realName, u.id]);
      console.log(`✓ Updated User ID ${u.id} (${reg}): "${u.name}" ➡️ "${realName}"`);
      updatedCount++;
    }
  }

  console.log(`🎉 Finished updating student names! Updated ${updatedCount} student records.`);
  await conn.end();
}

main().catch(console.error);
