const mysql = require('../artifacts/api-server/node_modules/mysql2/promise');
const fs = require('fs');
const path = require('path');

// Candidate data parser from id-card-upload.tsx
function parseCandidateData() {
  const tsxPath = path.join(__dirname, '../artifacts/hostel-outpass/src/pages/admin/id-card-upload.tsx');
  const content = fs.readFileSync(tsxPath, 'utf8');

  const startMarker = 'const candidateData = [';
  const endMarker = '];\n\n    // Groups of 5 students';
  const startPos = content.indexOf(startMarker);
  let endPos = content.indexOf(endMarker, startPos);
  if (endPos === -1) {
    endPos = content.indexOf('];', startPos);
  }

  const rawBlock = content.substring(startPos + startMarker.length, endPos);
  const regex = /\{\s*name:\s*"([^"]+)",\s*reg:\s*"([^"]+)",\s*barcode:\s*"([^"]+)",\s*dept:\s*"([^"]+)",\s*parent:\s*"([^"]+)",\s*phone:\s*"([^"]+)",\s*bg:\s*"([^"]+)",\s*dob:\s*"([^"]+)",\s*address:\s*"([^"]+)"(?:,\s*photo:\s*"([^"]+)")?/g;

  const students = [];
  let match;
  while ((match = regex.exec(rawBlock)) !== null) {
    students.push({
      name: match[1].trim(),
      reg: match[2].trim().toUpperCase(),
      barcode: match[3].trim().toUpperCase(),
      dept: match[4].trim().toUpperCase(),
      parent: match[5].trim(),
      phone: match[6].trim(),
      bg: match[7].trim(),
      dob: match[8].trim(),
      address: match[9].trim(),
      photo: match[10] ? match[10].trim() : `/students/${match[2].trim().toUpperCase()}.jpg`
    });
  }
  return students;
}

async function main() {
  console.log('🚀 Starting Full 50-Sheet Student Database Synchronization...');

  const students = parseCandidateData();
  console.log(`📋 Found ${students.length} students in candidate registry.`);

  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'hostel_pass_manager'
  });

  console.log('✓ Connected to MySQL database hostel_pass_manager');

  // 1. Ensure Department mapping exists
  const [deptRows] = await conn.query('SELECT id, code, name FROM departments');
  const deptMap = new Map();
  for (const d of deptRows) {
    deptMap.set(d.code.toUpperCase(), d.id);
  }

  // Pre-seed common departments if missing
  const deptsToEnsure = [
    { code: 'CSE', name: 'Computer Science & Engineering' },
    { code: 'IT', name: 'Information Technology' },
    { code: 'MECH', name: 'Mechanical Engineering' },
    { code: 'AUTO', name: 'Automobile Engineering' },
    { code: 'CIVIL', name: 'Civil Engineering' },
    { code: 'ECE', name: 'Electronics & Communication Engineering' },
    { code: 'EEE', name: 'Electrical & Electronics Engineering' },
    { code: 'AI & DS', name: 'Artificial Intelligence & Data Science' }
  ];

  for (const d of deptsToEnsure) {
    if (!deptMap.has(d.code)) {
      const [res] = await conn.query('INSERT INTO departments (code, name) VALUES (?, ?)', [d.code, d.name]);
      deptMap.set(d.code, res.insertId);
      console.log(`+ Created department: ${d.code} (${d.name}) [ID: ${res.insertId}]`);
    }
  }

  // 2. Ensure Classes exist
  const [classRows] = await conn.query('SELECT id, department_id, year, section FROM classes');
  const classMap = new Map();
  for (const c of classRows) {
    classMap.set(`${c.department_id}_${c.year}_${c.section}`, c.id);
  }

  async function getOrCreateClass(deptId, year, section) {
    const key = `${deptId}_${year}_${section}`;
    if (classMap.has(key)) return classMap.get(key);
    const [res] = await conn.query('INSERT INTO classes (department_id, year, section) VALUES (?, ?, ?)', [deptId, year, section]);
    classMap.set(key, res.insertId);
    return res.insertId;
  }

  let insertedCount = 0;
  let updatedCount = 0;

  for (let idx = 0; idx < students.length; idx++) {
    const s = students[idx];
    const deptId = deptMap.get(s.dept) || deptMap.get('CSE') || 1;
    const classId = await getOrCreateClass(deptId, 'I', 'A');

    const email = `${s.reg.toLowerCase()}@student.jkkm.ac.in`;
    const photoUrl = `/students/${s.reg}.jpg`;
    const roomNum = `A-${100 + (idx % 40) + 1}`;
    const bedNum = `Bed-${(idx % 4) + 1}`;

    // Check if student exists by registerNumber or barcode or email
    const [existing] = await conn.query(
      'SELECT id, name, register_number, email FROM users WHERE register_number = ? OR barcode = ? OR email = ?',
      [s.reg, s.barcode, email]
    );

    if (existing.length > 0) {
      // Update existing record with real photo, parent phone, address, etc.
      await conn.query(
        `UPDATE users SET 
          name = ?, 
          register_number = ?, 
          barcode = ?, 
          department_id = ?, 
          class_id = ?, 
          role = 'student', 
          student_type = 'HOSTELLER', 
          hostel_block = 'Kaveri Boys Hostel (Block A)', 
          hostel_room = ?, 
          bed_number = ?, 
          parent_name = ?, 
          parent_phone = ?, 
          parent_whatsapp = ?, 
          phone = ?, 
          address = ?, 
          photo_url = ?, 
          is_face_enrolled = 'true'
        WHERE id = ?`,
        [
          s.name, s.reg, s.barcode, deptId, classId, roomNum, bedNum,
          s.parent, s.phone, s.phone, s.phone, s.address,
          photoUrl, existing[0].id
        ]
      );
      updatedCount++;
    } else {
      // Insert fresh student record
      await conn.query(
        `INSERT INTO users (
          name, email, password_hash, register_number, barcode, phone, role, 
          department_id, class_id, student_type, hostel_block, hostel_room, bed_number, 
          parent_name, parent_phone, parent_whatsapp, address, 
          photo_url, attendance_percentage, is_face_enrolled
        ) VALUES (?, ?, ?, ?, ?, ?, 'student', ?, ?, 'HOSTELLER', 'Kaveri Boys Hostel (Block A)', ?, ?, ?, ?, ?, ?, ?, 92, 'true')`,
        [
          s.name, email, 'hashed_password123', s.reg, s.barcode, s.phone,
          deptId, classId, roomNum, bedNum, s.parent, s.phone, s.phone,
          s.address, photoUrl
        ]
      );
      insertedCount++;
    }
  }

  console.log(`\n🎉 Synchronization Complete!`);
  console.log(`   ➕ Inserted new students: ${insertedCount}`);
  console.log(`   🔄 Updated existing students: ${updatedCount}`);
  console.log(`   📊 Total active students: ${insertedCount + updatedCount}`);

  // Test verify sample newly added students from Sheets 46 to 50
  const sampleRegs = ['731225CS040', '731225CS045', '731225CS050', '731225CS055', '731225CS060', '731225IT001'];
  console.log('\n🔍 Verifying sample student records from new sheets:');
  for (const reg of sampleRegs) {
    const [rows] = await conn.query('SELECT name, register_number, barcode, photo_url, role FROM users WHERE register_number = ?', [reg]);
    if (rows.length > 0) {
      console.log(`   ✓ ${rows[0].register_number} (${rows[0].barcode}): ${rows[0].name} | Photo: ${rows[0].photo_url}`);
    } else {
      console.log(`   ✗ ${reg} NOT FOUND`);
    }
  }

  await conn.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
