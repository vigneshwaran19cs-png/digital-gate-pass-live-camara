import mysql from "./artifacts/api-server/node_modules/mysql2/promise.js";

async function test() {
  const connection = await mysql.createConnection("mysql://root@127.0.0.1:3306/hostel_pass_manager");
  const [users] = await connection.query("SELECT id, name, register_number, role, attendance_percentage, hostel_block, hostel_room, photo_url FROM users WHERE role = 'student' ORDER BY id ASC");
  console.log(`\n=== 🎓 TOTAL STUDENTS IN MYSQL: ${users.length} ===`);
  users.forEach((u, i) => {
    console.log(`${(i + 1).toString().padStart(2, ' ')}. ${u.name.padEnd(20, ' ')} | Reg: ${u.register_number} | Att: ${u.attendance_percentage}% | Room: ${u.hostel_room} | Photo: ${u.photo_url}`);
  });
  
  const [leaves] = await connection.query("SELECT l.id, u.name, l.leave_type, l.status, l.current_step, l.is_emergency FROM leaves l JOIN users u ON l.student_id = u.id ORDER BY l.id ASC");
  console.log(`\n=== 📋 LEAVE WORKFLOW SCENARIOS IN MYSQL: ${leaves.length} ===`);
  leaves.forEach(l => {
    console.log(`- ${l.name.padEnd(20, ' ')} | Type: ${l.leave_type.padEnd(16, ' ')} | Status: ${l.status.padEnd(18, ' ')} | Step: ${l.current_step.padEnd(14, ' ')} | Emergency: ${l.is_emergency}`);
  });

  const [gateLogs] = await connection.query("SELECT g.id, u.name, g.action_type, g.verification_method, g.gate_name, g.timestamp FROM gate_logs g JOIN users u ON g.student_id = u.id ORDER BY g.timestamp DESC");
  console.log(`\n=== 🚪 GATE LOGS & HISTORY IN MYSQL: ${gateLogs.length} ===`);
  gateLogs.forEach(g => {
    console.log(`- ${g.name.padEnd(20, ' ')} | ${g.action_type} via ${g.verification_method.padEnd(6, ' ')} at ${g.gate_name}`);
  });

  const [staff] = await connection.query("SELECT id, name, email, role, phone FROM users WHERE role != 'student' ORDER BY id ASC");
  console.log(`\n=== 👥 STAFF ACCOUNTS IN MYSQL: ${staff.length} ===`);
  staff.forEach(s => {
    console.log(`- ${s.role.toUpperCase().padEnd(12, ' ')}: ${s.name.padEnd(35, ' ')} | Email: ${s.email} (PW: password123)`);
  });

  await connection.end();
}

test().catch(console.error);
