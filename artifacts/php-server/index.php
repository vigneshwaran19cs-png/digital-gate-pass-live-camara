<?php
// CORS headers for local development and cross-origin requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Student-Id, X-User-Id");
header("Content-Type: application/json; charset=UTF-8");

// Stop execution on preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Polyfill for getallheaders if it does not exist (e.g., non-Apache servers)
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            } elseif ($name == 'CONTENT_TYPE') {
                $headers['Content-Type'] = $value;
            } elseif ($name == 'CONTENT_LENGTH') {
                $headers['Content-Length'] = $value;
            }
        }
        return $headers;
    }
}

// Built-in PHP CLI server static file server routing fallback
if (php_sapi_name() === 'cli-server') {
    $filePath = __DIR__ . $_SERVER['REQUEST_URI'];
    if (is_file($filePath)) {
        return false;
    }
}

// Global Exception and Error Handlers to output JSON errors
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    echo json_encode(["error" => "$errstr in $errfile on line $errline"]);
    exit;
});

set_exception_handler(function($e) {
    http_response_code(500);
    echo json_encode(["error" => $e->getMessage()]);
    exit;
});

// Walk up directories to load the .env file
$envPath = null;
$dir = __DIR__;
while ($dir) {
    $candidate = $dir . DIRECTORY_SEPARATOR . '.env';
    if (file_exists($candidate)) {
        $envPath = $candidate;
        break;
    }
    $parent = dirname($dir);
    if ($parent === $dir) break;
    $dir = $parent;
}

// Database Connection default settings (XAMPP MySQL defaults)
$dbHost = 'localhost';
$dbPort = '3306';
$dbName = 'hostel_pass_manager';
$dbUser = 'root';
$dbPass = '';

if ($envPath) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if (strpos($line, '#') === 0 || !strpos($line, '=')) continue;
        list($key, $val) = explode('=', $line, 2);
        $key = trim($key);
        $val = trim($val);
        if (preg_match('/^["\'\s]*(.*?)["\'\s]*$/', $val, $matches)) {
            $val = $matches[1];
        }
        if ($key === 'DATABASE_URL') {
            // Parses mysql://user:pass@host:port/dbname
            if (preg_match('/^mysql:\/\/([^:@]+)(?::([^@]+))?@([^:\/]+)(?::(\d+))?\/([^\s\?]+)/', $val, $dbMatches)) {
                $dbUser = $dbMatches[1];
                $dbPass = $dbMatches[2] ?? '';
                $dbHost = $dbMatches[3];
                $dbPort = $dbMatches[4] ?? '3306';
                $dbName = $dbMatches[5];
            }
        }
    }
}

// Initialize MySQL PDO Connection (auto-creates Database and Tables if missing)
try {
    $dsn = "mysql:host=$dbHost;port=$dbPort;charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    
    // Create database if not exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbName` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE `$dbName`");
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed: " . $e->getMessage()]);
    exit;
}

// Initialize tables if they don't exist
$pdo->exec("
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  hod_id INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
");

$pdo->exec("
CREATE TABLE IF NOT EXISTS classes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  department_id INT NOT NULL,
  year ENUM('I', 'II', 'III', 'IV') NOT NULL,
  section VARCHAR(10) NOT NULL,
  tutor_id INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB;
");

$pdo->exec("
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'tutor', 'hod', 'principal', 'warden', 'security', 'super_admin') NOT NULL,
  register_number VARCHAR(100),
  department_id INT,
  class_id INT,
  hostel_block VARCHAR(50),
  hostel_room VARCHAR(50),
  phone VARCHAR(20),
  parent_phone VARCHAR(20),
  parent_name VARCHAR(255),
  parent_whatsapp VARCHAR(20),
  parent_email VARCHAR(255),
  address TEXT,
  designation VARCHAR(255),
  photo_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL
) ENGINE=InnoDB;
");

// Add columns to existing users table if they were not created initially
try { $pdo->exec("ALTER TABLE users ADD COLUMN department_id INT AFTER role"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE users ADD COLUMN class_id INT AFTER department_id"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE users ADD COLUMN hostel_block VARCHAR(50) AFTER class_id"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE users ADD COLUMN parent_whatsapp VARCHAR(20) AFTER parent_phone"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE users ADD COLUMN parent_email VARCHAR(255) AFTER parent_whatsapp"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE users ADD COLUMN address TEXT AFTER parent_email"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE users ADD COLUMN designation VARCHAR(255) AFTER address"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE users ADD COLUMN parent_name VARCHAR(255) AFTER parent_phone"); } catch (PDOException $e) {}

// Alter table users foreign keys
try { $pdo->exec("ALTER TABLE users ADD FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL"); } catch (PDOException $e) {}
try { $pdo->exec("ALTER TABLE users ADD FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL"); } catch (PDOException $e) {}

$pdo->exec("
CREATE TABLE IF NOT EXISTS leaves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  pass_type ENUM('leave', 'outing', 'hostel_leave', 'outing_pass') NOT NULL DEFAULT 'hostel_leave',
  leave_type ENUM('semester_holiday', 'study_holiday', 'diwali_holiday', 'pongal_holiday', 'christmas_holiday', 'ramzan_holiday', 'internship', 'project_work', 'family_function', 'family_emergency', 'marriage_function', 'medical_leave', 'hospital_visit', 'hair_cut', 'shopping', 'atm_withdrawal', 'bank_visit', 'medical_checkup', 'personal_work', 'other', 'home', 'medical', 'emergency', 'personal', 'educational') NOT NULL,
  reason TEXT NOT NULL,
  ai_generated_letter TEXT,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  destination TEXT NOT NULL,
  status ENUM('pending', 'warden_approved', 'tutor_approved', 'hod_approved', 'principal_approved', 'fully_approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  current_step ENUM('warden', 'tutor', 'hod', 'principal', 'warden_final', 'completed', 'rejected') NOT NULL DEFAULT 'warden',
  warden_remarks TEXT,
  tutor_remarks TEXT,
  hod_remarks TEXT,
  principal_remarks TEXT,
  parent_call_status ENUM('pending', 'confirmed', 'rejected', 'not_reachable', 'completed'),
  parent_call_notes TEXT,
  outpass_id INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
");

try {
    $pdo->exec("ALTER TABLE leaves ADD COLUMN pass_type ENUM('leave', 'outing', 'hostel_leave', 'outing_pass') NOT NULL DEFAULT 'hostel_leave' AFTER student_id");
} catch (PDOException $e) {
    try {
        $pdo->exec("ALTER TABLE leaves MODIFY COLUMN pass_type ENUM('leave', 'outing', 'hostel_leave', 'outing_pass') NOT NULL DEFAULT 'hostel_leave'");
    } catch (PDOException $e2) {}
}

try {
    $pdo->exec("ALTER TABLE leaves ADD COLUMN ai_generated_letter TEXT AFTER reason");
} catch (PDOException $e) {
    // Column already exists
}

try {
    $pdo->exec("ALTER TABLE leaves MODIFY COLUMN leave_type ENUM('semester_holiday', 'study_holiday', 'diwali_holiday', 'pongal_holiday', 'christmas_holiday', 'ramzan_holiday', 'internship', 'project_work', 'family_function', 'family_emergency', 'marriage_function', 'medical_leave', 'hospital_visit', 'hair_cut', 'shopping', 'atm_withdrawal', 'bank_visit', 'medical_checkup', 'personal_work', 'other', 'home', 'medical', 'emergency', 'personal', 'educational') NOT NULL");
} catch (PDOException $e) {
    // Column already updated
}

$pdo->exec("
CREATE TABLE IF NOT EXISTS outpasses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leave_id INT NOT NULL,
  student_id INT NOT NULL,
  outpass_code VARCHAR(255) NOT NULL UNIQUE,
  gate_pass_number VARCHAR(255) UNIQUE,
  qr_data TEXT NOT NULL,
  staff_details TEXT,
  status ENUM('generated', 'verified', 'returned', 'expired') NOT NULL DEFAULT 'generated',
  exit_time TIMESTAMP NULL DEFAULT NULL,
  return_time TIMESTAMP NULL DEFAULT NULL,
  gate_location VARCHAR(255),
  verified_by INT,
  approved_by_warden VARCHAR(255),
  approved_by_tutor VARCHAR(255),
  approved_by_hod VARCHAR(255),
  approved_by_principal VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leave_id) REFERENCES leaves(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
");

$pdo->exec("
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('leave_submitted', 'leave_approved', 'leave_rejected', 'outpass_generated', 'exit_recorded', 'return_reminder', 'parent_notified', 'bulk_action') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  leave_id INT,
  outpass_id INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
");

// Seeding departments and classes if empty
$stmt = $pdo->query("SELECT COUNT(*) FROM departments");
if ($stmt->fetchColumn() == 0) {
    $officialDepts = [
        ['name' => 'CYBER SECURITY', 'code' => 'CYBER'],
        ['name' => 'ARTIFICIAL INTELLIGENCE AND DATA SCIENCE', 'code' => 'AIDS'],
        ['name' => 'COMPUTER SCIENCE AND ENGINEERING', 'code' => 'CSE'],
        ['name' => 'INFORMATION TECHNOLOGY', 'code' => 'IT'],
        ['name' => 'MECHANICAL ENGINEERING', 'code' => 'MECH'],
        ['name' => 'SCIENCE AND HUMANITIES', 'code' => 'S&H'],
        ['name' => 'ELECTRONICS AND COMMUNICATION ENGINEERING', 'code' => 'ECE'],
        ['name' => 'ELECTRICAL AND ELECTRONICS ENGINEERING', 'code' => 'EEE'],
        ['name' => 'AUTOMOBILE ENGINEERING', 'code' => 'AUTO'],
        ['name' => 'CIVIL ENGINEERING', 'code' => 'CIVIL'],
        ['name' => 'COMPUTER APPLICATIONS', 'code' => 'BCA / MCA'],
        ['name' => 'MANAGEMENT STUDIES', 'code' => 'MBA']
    ];

    $years = ['I', 'II', 'III', 'IV'];
    $sections = ['A', 'B'];

    $insertDept = $pdo->prepare("INSERT INTO departments (name, code) VALUES (?, ?)");
    $insertClass = $pdo->prepare("INSERT INTO classes (department_id, year, section) VALUES (?, ?, ?)");

    foreach ($officialDepts as $dept) {
        $insertDept->execute([$dept['name'], $dept['code']]);
        $deptId = $pdo->lastInsertId();

        foreach ($years as $yr) {
            foreach ($sections as $sec) {
                $insertClass->execute([$deptId, $yr, $sec]);
            }
        }
    }
}

// Database Seeding users if empty
$stmt = $pdo->query("SELECT COUNT(*) FROM users");
if ($stmt->fetchColumn() == 0) {
    $demoUsers = [
        [
            'name' => 'John Doe',
            'email' => 'john@example.com',
            'password_hash' => 'hashed_password',
            'role' => 'student',
            'register_number' => 'STU001',
            'phone' => '1234567890',
            'parent_phone' => '0987654321',
            'parent_name' => 'Jane Doe',
            'hostel_room' => 'A-101',
            'photo_url' => ''
        ],
        [
            'name' => 'Mr. Warden',
            'email' => 'warden@example.com',
            'password_hash' => 'hashed_password',
            'role' => 'warden',
            'register_number' => null,
            'phone' => null,
            'parent_phone' => null,
            'parent_name' => null,
            'hostel_room' => null,
            'photo_url' => null
        ],
        [
            'name' => 'Dr. Smith',
            'email' => 'tutor@example.com',
            'password_hash' => 'hashed_password',
            'role' => 'tutor',
            'register_number' => null,
            'phone' => null,
            'parent_phone' => null,
            'parent_name' => null,
            'hostel_room' => null,
            'photo_url' => null
        ],
        [
            'name' => 'Prof. Hod',
            'email' => 'hod@example.com',
            'password_hash' => 'hashed_password',
            'role' => 'hod',
            'register_number' => null,
            'phone' => null,
            'parent_phone' => null,
            'parent_name' => null,
            'hostel_room' => null,
            'photo_url' => null
        ],
        [
            'name' => 'Dr. Principal',
            'email' => 'principal@example.com',
            'password_hash' => 'hashed_password',
            'role' => 'principal',
            'register_number' => null,
            'phone' => null,
            'parent_phone' => null,
            'parent_name' => null,
            'hostel_room' => null,
            'photo_url' => null
        ],
        [
            'name' => 'Officer Security',
            'email' => 'security@example.com',
            'password_hash' => 'hashed_password',
            'role' => 'security',
            'register_number' => null,
            'phone' => null,
            'parent_phone' => null,
            'parent_name' => null,
            'hostel_room' => null,
            'photo_url' => null
        ],
        [
            'name' => 'Super Admin',
            'email' => 'admin@example.com',
            'password_hash' => 'hashed_password',
            'role' => 'super_admin',
            'register_number' => null,
            'phone' => null,
            'parent_phone' => null,
            'parent_name' => null,
            'hostel_room' => null,
            'photo_url' => null
        ]
    ];

    $insertSql = "INSERT INTO users (name, email, password_hash, role, register_number, phone, parent_phone, parent_name, hostel_room, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $insertStmt = $pdo->prepare($insertSql);
    foreach ($demoUsers as $u) {
        $insertStmt->execute([
            $u['name'],
            $u['email'],
            $u['password_hash'],
            $u['role'],
            $u['register_number'],
            $u['phone'],
            $u['parent_phone'],
            $u['parent_name'],
            $u['hostel_room'],
            $u['photo_url']
        ]);
    }
}

// Link demo users to the Computer Science (CSE) department and a class (III Year A)
try {
    $stmtD = $pdo->query("SELECT id FROM departments WHERE code = 'CSE'");
    $cseDeptId = $stmtD->fetchColumn();

    if ($cseDeptId) {
        $stmtC = $pdo->prepare("SELECT id FROM classes WHERE department_id = ? AND year = 'III' AND section = 'A'");
        $stmtC->execute([$cseDeptId]);
        $cseClassId = $stmtC->fetchColumn();

        $studentId = $pdo->query("SELECT id FROM users WHERE email = 'john@example.com'")->fetchColumn();
        $tutorId = $pdo->query("SELECT id FROM users WHERE email = 'tutor@example.com'")->fetchColumn();
        $hodId = $pdo->query("SELECT id FROM users WHERE email = 'hod@example.com'")->fetchColumn();

        if ($studentId) {
            $pdo->prepare("UPDATE users SET department_id = ?, class_id = ? WHERE id = ?")->execute([$cseDeptId, $cseClassId ?: null, $studentId]);
        }
        if ($tutorId) {
            $pdo->prepare("UPDATE users SET department_id = ?, class_id = ? WHERE id = ?")->execute([$cseDeptId, $cseClassId ?: null, $tutorId]);
            if ($cseClassId) {
                $pdo->prepare("UPDATE classes SET tutor_id = ? WHERE id = ?")->execute([$tutorId, $cseClassId]);
            }
        }
        if ($hodId) {
            $pdo->prepare("UPDATE users SET department_id = ? WHERE id = ?")->execute([$cseDeptId, $hodId]);
            $pdo->prepare("UPDATE departments SET hod_id = ? WHERE id = ?")->execute([$hodId, $cseDeptId]);
        }
    }
} catch (Exception $e) {
    // Fail silently during seeding linking
}

// -------------------------------------------------------------
// HELPER FUNCTIONS FOR CASING AND TOKENS
// -------------------------------------------------------------
function snakeToCamel($key) {
    return lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $key))));
}

function camelToSnake($key) {
    return strtolower(preg_replace('/(?<!^)[A-Z]/', '_$0', $key));
}

function convertKeys($data, $direction = 'camel') {
    if (!is_array($data)) return $data;
    $result = [];
    foreach ($data as $k => $v) {
        $newKey = is_numeric($k) ? $k : ($direction === 'camel' ? snakeToCamel($k) : camelToSnake($k));
        $result[$newKey] = convertKeys($v, $direction);
    }
    return $result;
}

function sanitizeUser($user) {
    if (!$user) return null;
    $user = convertKeys($user, 'camel');
    unset($user['passwordHash']);
    return $user;
}

function getHeader($name) {
    $headers = getallheaders();
    foreach ($headers as $key => $value) {
        if (strtolower($key) === strtolower($name)) {
            return $value;
        }
    }
    $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
    if (isset($_SERVER[$serverKey])) {
        return $_SERVER[$serverKey];
    }
    if (strtolower($name) == 'content-type' && isset($_SERVER['CONTENT_TYPE'])) {
        return $_SERVER['CONTENT_TYPE'];
    }
    return null;
}

function parseToken($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    $payloadJson = base64_decode(strtr($parts[1], '-_', '+/'));
    if (!$payloadJson) return null;
    $payload = json_decode($payloadJson, true);
    if (!$payload) return null;
    if (isset($payload['exp']) && $payload['exp'] < (time() * 1000)) {
        return null;
    }
    return $payload;
}

function makeToken($userId, $role) {
    $payload = [
        'userId' => (int)$userId,
        'role' => $role,
        'exp' => (time() + 86400) * 1000
    ];
    $payloadEncoded = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    return "demo.{$payloadEncoded}.sig";
}

function getAuthenticatedUser($pdo) {
    $authHeader = getHeader('authorization');
    if (!$authHeader || strpos($authHeader, 'Bearer ') !== 0) {
        return null;
    }
    $token = substr($authHeader, 7);
    $parsed = parseToken($token);
    if (!$parsed) return null;
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$parsed['userId']]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function checkAndAlertOverdueReturns($pdo) {
    try {
        $todayStr = date('Y-m-d H:i:s');
        $stmt = $pdo->query("SELECT o.*, l.to_date, l.pass_type FROM outpasses o JOIN leaves l ON o.leave_id = l.id WHERE o.status = 'verified'");
        $outsideOutpasses = $stmt->fetchAll();
        
        $stmtW = $pdo->query("SELECT id FROM users WHERE role = 'warden'");
        $wardens = $stmtW->fetchAll();
        if (empty($wardens)) return;
        
        foreach ($outsideOutpasses as $o) {
            $isOverdue = false;
            if ($o['pass_type'] === 'outing') {
                $expectedTime = $o['to_date'] . ' 18:00:00';
                if (strtotime($todayStr) > strtotime($expectedTime)) {
                    $isOverdue = true;
                }
            } else {
                $expectedTime = $o['to_date'] . ' 23:59:59';
                if (strtotime($todayStr) > strtotime($expectedTime)) {
                    $isOverdue = true;
                }
            }
            
            if ($isOverdue) {
                foreach ($wardens as $w) {
                    $stmtCheckN = $pdo->prepare("SELECT COUNT(*) FROM notifications WHERE user_id = ? AND type = 'return_reminder' AND outpass_id = ?");
                    $stmtCheckN->execute([$w['id'], $o['id']]);
                    if ($stmtCheckN->fetchColumn() == 0) {
                        $stmtS = $pdo->prepare("SELECT name, register_number FROM users WHERE id = ?");
                        $stmtS->execute([$o['student_id']]);
                        $student = $stmtS->fetch();
                        $sName = $student['name'] ?? 'Student';
                        $sReg = $student['register_number'] ?? '';
                        
                        $stmtInsertN = $pdo->prepare("INSERT INTO notifications (user_id, type, title, message, is_read, outpass_id) VALUES (?, 'return_reminder', '⚠️ Overdue Return Alert', ?, 0, ?)");
                        $stmtInsertN->execute([
                            $w['id'],
                            "Student {$sName} ({$sReg}) has exceeded the approved return time ({$o['to_date']}).",
                            $o['id']
                        ]);
                    }
                }
            }
        }
    } catch (Exception $e) {
        // Safe fail-silent
    }
}

function generateOutpassCode($leaveId, $studentId, $yearSeq = 1) {
    $year = date("Y");
    $seq = $yearSeq ?? 1;
    $gatePassNumber = "GP-" . $year . "-" . str_pad($seq, 4, "0", STR_PAD_LEFT);
    $qrData = json_encode([
        'outpassCode' => $gatePassNumber,
        'gatePassNumber' => $gatePassNumber,
        'leaveId' => (int)$leaveId,
        'studentId' => (int)$studentId,
        'generatedAt' => date('c'),
        'type' => 'HOSTEL_OUTPASS'
    ]);
    return [
        'code' => $gatePassNumber,
        'qrData' => $qrData,
        'gatePassNumber' => $gatePassNumber
    ];
}

function notifyNextStepUsers($pdo, $leaveId, $newStep, $studentName, $destination) {
    $role = $newStep;
    if ($newStep === 'warden_final') {
        $role = 'warden';
    }
    if ($role === 'completed' || $role === 'rejected') {
        return;
    }
    
    // Fetch leave and student to get department_id and class_id
    $stmtL = $pdo->prepare("SELECT student_id FROM leaves WHERE id = ?");
    $stmtL->execute([$leaveId]);
    $leave = $stmtL->fetch();
    $studentId = $leave ? $leave['student_id'] : null;
    
    $student = null;
    if ($studentId) {
        $stmtS = $pdo->prepare("SELECT department_id, class_id FROM users WHERE id = ?");
        $stmtS->execute([$studentId]);
        $student = $stmtS->fetch();
    }
    
    $targetUserIds = [];
    if ($role === 'tutor' && $student && $student['class_id']) {
        $stmtC = $pdo->prepare("SELECT tutor_id FROM classes WHERE id = ?");
        $stmtC->execute([$student['class_id']]);
        $tutorId = $stmtC->fetchColumn();
        if ($tutorId) {
            $targetUserIds[] = (int)$tutorId;
        }
    } else if ($role === 'hod' && $student && $student['department_id']) {
        $stmtD = $pdo->prepare("SELECT hod_id FROM departments WHERE id = ?");
        $stmtD->execute([$student['department_id']]);
        $hodId = $stmtD->fetchColumn();
        if ($hodId) {
            $targetUserIds[] = (int)$hodId;
        }
    }
    
    if (empty($targetUserIds)) {
        // Fallback: Notify all users with that role
        $stmtU = $pdo->prepare("SELECT id FROM users WHERE role = ?");
        $stmtU->execute([$role]);
        $targetUserIds = array_column($stmtU->fetchAll(), 'id');
    }
    
    foreach ($targetUserIds as $uId) {
        $stmtN = $pdo->prepare("INSERT INTO notifications (user_id, type, title, message, is_read, leave_id) VALUES (?, 'leave_submitted', 'Action Required: Leave Request', ?, 0, ?)");
        $stmtN->execute([
            $uId,
            "Leave request from {$studentName} to {$destination} is pending your approval.",
            $leaveId
        ]);
    }
}

// -------------------------------------------------------------
// ROUTER LOGIC
// -------------------------------------------------------------
$requestUri = $_SERVER['REQUEST_URI'];
if ($pos = strpos($requestUri, '?')) {
    $requestUri = substr($requestUri, 0, $pos);
}

// Strip subdirectory prefix if hosting under a subfolder (e.g. XAMPP htdocs/hostel_pass_manager)
$baseDir = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME']));
$baseDir = rtrim($baseDir, '/');
if (!empty($baseDir) && strpos($requestUri, $baseDir) === 0) {
    $requestUri = substr($requestUri, strlen($baseDir));
}

// Extract the path segment relative to `/api` or relative to script name
$apiPos = strpos($requestUri, '/api');
if ($apiPos !== false) {
    $path = substr($requestUri, $apiPos + 4);
} else {
    $indexPos = strpos($requestUri, 'index.php');
    if ($indexPos !== false) {
        $path = substr($requestUri, $indexPos + 9);
    } else {
        $path = $requestUri;
    }
}
$path = '/' . trim($path, '/');
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true) ?? [];

$matches = [];

// 1. Health check
if ($method === 'GET' && $path === '/healthz') {
    echo json_encode(["status" => "ok"]);
    exit;
}

// 2. Auth: Login
if ($method === 'POST' && $path === '/auth/login') {
    $email = $body['email'] ?? null;
    $password = $body['password'] ?? null;
    if (!$email || !$password) {
        http_response_code(400);
        echo json_encode(["error" => "Email and password required"]);
        exit;
    }
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user || ($user['password_hash'] !== "hashed_" . $password && $user['password_hash'] !== $password)) {
        http_response_code(401);
        echo json_encode(["error" => "Invalid credentials"]);
        exit;
    }
    
    $token = makeToken($user['id'], $user['role']);
    echo json_encode([
        "token" => $token,
        "user" => sanitizeUser($user)
    ]);
    exit;
}

// 3. Auth: Logout
if ($method === 'POST' && $path === '/auth/logout') {
    echo json_encode(["success" => true]);
    exit;
}

// 4. Auth: Me
if ($method === 'GET' && $path === '/auth/me') {
    $user = getAuthenticatedUser($pdo);
    if (!$user) {
        http_response_code(401);
        echo json_encode(["error" => "Unauthorized"]);
        exit;
    }
    echo json_encode(sanitizeUser($user));
    exit;
}

// 5. Users: List
if ($method === 'GET' && $path === '/users') {
    $role = $_GET['role'] ?? null;
    $departmentId = $_GET['departmentId'] ?? null;
    
    $sql = "SELECT * FROM users";
    $params = [];
    $conds = [];
    if ($role) {
        $conds[] = "role = ?";
        $params[] = $role;
    }
    if ($departmentId) {
        $conds[] = "department_id = ?";
        $params[] = (int)$departmentId;
    }
    if ($conds) {
        $sql .= " WHERE " . implode(" AND ", $conds);
    }
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $users = $stmt->fetchAll();
    
    echo json_encode(array_map('sanitizeUser', $users));
    exit;
}

// 6. Users: Create
if ($method === 'POST' && $path === '/users') {
    $data = convertKeys($body, 'snake');
    $password = $body['password'] ?? 'password123';
    $data['password_hash'] = 'hashed_' . $password;
    unset($data['password']);
    
    $cols = implode(", ", array_keys($data));
    $placeholders = implode(", ", array_fill(0, count($data), "?"));
    
    $stmt = $pdo->prepare("INSERT INTO users ($cols) VALUES ($placeholders)");
    $stmt->execute(array_values($data));
    $id = $pdo->lastInsertId();
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    
    http_response_code(201);
    echo json_encode(sanitizeUser($user));
    exit;
}

// 7. Users: Get Individual
if ($method === 'GET' && preg_match('#^/users/(?P<id>\d+)$#', $path, $matches)) {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $user = $stmt->fetch();
    if (!$user) {
        http_response_code(404);
        echo json_encode(["error" => "User not found"]);
        exit;
    }
    echo json_encode(sanitizeUser($user));
    exit;
}

// 8. Users: Patch/Update
if ($method === 'PATCH' && preg_match('#^/users/(?P<id>\d+)$#', $path, $matches)) {
    $data = convertKeys($body, 'snake');
    if (isset($data['password'])) {
        if (!empty($data['password'])) {
            $data['password_hash'] = 'hashed_' . $data['password'];
        }
        unset($data['password']);
    }
    if (!empty($data)) {
        $sets = [];
        $params = [];
        foreach ($data as $col => $val) {
            $sets[] = "$col = ?";
            $params[] = $val;
        }
        $params[] = $matches['id'];
        
        $sql = "UPDATE users SET " . implode(", ", $sets) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $user = $stmt->fetch();
    if (!$user) {
        http_response_code(404);
        echo json_encode(["error" => "User not found"]);
        exit;
    }
    echo json_encode(sanitizeUser($user));
    exit;
}

// 9. Users: Delete
if ($method === 'DELETE' && preg_match('#^/users/(?P<id>\d+)$#', $path, $matches)) {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $user = $stmt->fetch();
    if (!$user) {
        http_response_code(404);
        echo json_encode(["error" => "User not found"]);
        exit;
    }
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$matches['id']]);
    http_response_code(204);
    exit;
}

// 9a. Departments: CRUD
if ($method === 'GET' && $path === '/departments') {
    $stmt = $pdo->query("SELECT * FROM departments ORDER BY name ASC");
    $depts = $stmt->fetchAll();
    echo json_encode(convertKeys($depts, 'camel'));
    exit;
}

if ($method === 'POST' && $path === '/departments') {
    $data = convertKeys($body, 'snake');
    $cols = implode(", ", array_keys($data));
    $placeholders = implode(", ", array_fill(0, count($data), "?"));
    
    $stmt = $pdo->prepare("INSERT INTO departments ($cols) VALUES ($placeholders)");
    $stmt->execute(array_values($data));
    $id = $pdo->lastInsertId();
    
    $stmt = $pdo->prepare("SELECT * FROM departments WHERE id = ?");
    $stmt->execute([$id]);
    $dept = $stmt->fetch();
    
    http_response_code(201);
    echo json_encode(convertKeys($dept, 'camel'));
    exit;
}

if ($method === 'PATCH' && preg_match('#^/departments/(?P<id>\d+)$#', $path, $matches)) {
    $data = convertKeys($body, 'snake');
    if (!empty($data)) {
        $sets = [];
        $params = [];
        foreach ($data as $col => $val) {
            $sets[] = "$col = ?";
            $params[] = $val;
        }
        $params[] = $matches['id'];
        
        $sql = "UPDATE departments SET " . implode(", ", $sets) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }
    
    $stmt = $pdo->prepare("SELECT * FROM departments WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $dept = $stmt->fetch();
    if (!$dept) {
        http_response_code(404);
        echo json_encode(["error" => "Department not found"]);
        exit;
    }
    echo json_encode(convertKeys($dept, 'camel'));
    exit;
}

if ($method === 'DELETE' && preg_match('#^/departments/(?P<id>\d+)$#', $path, $matches)) {
    $stmt = $pdo->prepare("SELECT * FROM departments WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $dept = $stmt->fetch();
    if (!$dept) {
        http_response_code(404);
        echo json_encode(["error" => "Department not found"]);
        exit;
    }
    $stmt = $pdo->prepare("DELETE FROM departments WHERE id = ?");
    $stmt->execute([$matches['id']]);
    http_response_code(204);
    exit;
}

// 9b. Classes: CRUD
if ($method === 'GET' && $path === '/classes') {
    $departmentId = $_GET['departmentId'] ?? null;
    $sql = "SELECT * FROM classes";
    $params = [];
    if ($departmentId) {
        $sql .= " WHERE department_id = ?";
        $params[] = (int)$departmentId;
    }
    $sql .= " ORDER BY year ASC, section ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $classes = $stmt->fetchAll();
    echo json_encode(convertKeys($classes, 'camel'));
    exit;
}

if ($method === 'POST' && $path === '/classes') {
    $data = convertKeys($body, 'snake');
    $cols = implode(", ", array_keys($data));
    $placeholders = implode(", ", array_fill(0, count($data), "?"));
    
    $stmt = $pdo->prepare("INSERT INTO classes ($cols) VALUES ($placeholders)");
    $stmt->execute(array_values($data));
    $id = $pdo->lastInsertId();
    
    $stmt = $pdo->prepare("SELECT * FROM classes WHERE id = ?");
    $stmt->execute([$id]);
    $class = $stmt->fetch();
    
    http_response_code(201);
    echo json_encode(convertKeys($class, 'camel'));
    exit;
}

if ($method === 'PATCH' && preg_match('#^/classes/(?P<id>\d+)$#', $path, $matches)) {
    $data = convertKeys($body, 'snake');
    if (!empty($data)) {
        $sets = [];
        $params = [];
        foreach ($data as $col => $val) {
            $sets[] = "$col = ?";
            $params[] = $val;
        }
        $params[] = $matches['id'];
        
        $sql = "UPDATE classes SET " . implode(", ", $sets) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }
    
    $stmt = $pdo->prepare("SELECT * FROM classes WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $class = $stmt->fetch();
    if (!$class) {
        http_response_code(404);
        echo json_encode(["error" => "Class not found"]);
        exit;
    }
    echo json_encode(convertKeys($class, 'camel'));
    exit;
}

if ($method === 'DELETE' && preg_match('#^/classes/(?P<id>\d+)$#', $path, $matches)) {
    $stmt = $pdo->prepare("SELECT * FROM classes WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $class = $stmt->fetch();
    if (!$class) {
        http_response_code(404);
        echo json_encode(["error" => "Class not found"]);
        exit;
    }
    $stmt = $pdo->prepare("DELETE FROM classes WHERE id = ?");
    $stmt->execute([$matches['id']]);
    http_response_code(204);
    exit;
}

// 10. Leaves: Similar Groups
if ($method === 'GET' && $path === '/leaves/similar-groups') {
    $user = getAuthenticatedUser($pdo);
    $status = 'pending';
    if ($user) {
        if ($user['role'] === 'hod') {
            $status = 'tutor_approved';
        } else if ($user['role'] === 'principal') {
            $status = 'hod_approved';
        } else if ($user['role'] === 'tutor') {
            $status = 'warden_approved';
        }
    }
    if (isset($_GET['status'])) {
        $status = $_GET['status'];
    }
    
    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE status = ?");
    $stmt->execute([$status]);
    $leaves = $stmt->fetchAll();
    
    $groups = [];
    foreach ($leaves as $leave) {
        $key = $leave['destination'] . '|' . $leave['from_date'] . '|' . $leave['to_date'];
        if (!isset($groups[$key])) {
            $groups[$key] = [];
        }
        $groups[$key][] = $leave;
    }
    
    $resGroups = [];
    foreach ($groups as $key => $groupLeaves) {
        if (count($groupLeaves) > 1) {
            $withStudents = [];
            $leaveIds = [];
            foreach ($groupLeaves as $l) {
                $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
                $stmt->execute([$l['student_id']]);
                $student = $stmt->fetch();
                $l['student'] = sanitizeUser($student);
                $withStudents[] = convertKeys($l, 'camel');
                $leaveIds[] = (int)$l['id'];
            }
            $resGroups[] = [
                'destination' => $groupLeaves[0]['destination'],
                'fromDate' => $groupLeaves[0]['from_date'],
                'toDate' => $groupLeaves[0]['to_date'],
                'reason' => $groupLeaves[0]['reason'],
                'department' => null,
                'count' => count($groupLeaves),
                'leaveIds' => $leaveIds,
                'leaves' => $withStudents
            ];
        }
    }
    
    echo json_encode($resGroups);
    exit;
}

// 11. Leaves: List
if ($method === 'GET' && $path === '/leaves') {
    $status = $_GET['status'] ?? null;
    $studentId = $_GET['studentId'] ?? null;
    $departmentId = $_GET['departmentId'] ?? null;
    $classId = $_GET['classId'] ?? null;
    
    // Scoping check for logged in user
    $user = getAuthenticatedUser($pdo);
    $forcedDepartmentId = $departmentId ? (int)$departmentId : null;
    $forcedClassId = $classId ? (int)$classId : null;
    
    if ($user) {
        if ($user['role'] === 'hod') {
            $stmtDept = $pdo->prepare("SELECT id FROM departments WHERE hod_id = ?");
            $stmtDept->execute([$user['id']]);
            $deptId = $stmtDept->fetchColumn();
            if ($deptId) $forcedDepartmentId = (int)$deptId;
        } else if ($user['role'] === 'tutor') {
            $stmtCls = $pdo->prepare("SELECT id FROM classes WHERE tutor_id = ?");
            $stmtCls->execute([$user['id']]);
            $clsId = $stmtCls->fetchColumn();
            if ($clsId) $forcedClassId = (int)$clsId;
        }
    }
    
    $sql = "SELECT * FROM leaves";
    $params = [];
    $conds = [];
    if ($status) {
        $conds[] = "status = ?";
        $params[] = $status;
    }
    if ($studentId) {
        $conds[] = "student_id = ?";
        $params[] = (int)$studentId;
    }
    if ($conds) {
        $sql .= " WHERE " . implode(" AND ", $conds);
    }
    $sql .= " ORDER BY created_at ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $leaves = $stmt->fetchAll();
    
    $withStudents = [];
    foreach ($leaves as $leave) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$leave['student_id']]);
        $student = $stmt->fetch();
        if ($student) {
            if ($forcedDepartmentId && (int)$student['department_id'] !== $forcedDepartmentId) {
                continue;
            }
            if ($forcedClassId && (int)$student['class_id'] !== $forcedClassId) {
                continue;
            }
            $leave['student'] = sanitizeUser($student);
        } else {
            if ($forcedDepartmentId || $forcedClassId) {
                continue;
            }
            $leave['student'] = null;
        }
        $withStudents[] = convertKeys($leave, 'camel');
    }
    
    echo json_encode($withStudents);
    exit;
}

// 12. Leaves: Create
if ($method === 'POST' && $path === '/leaves') {
    $studentId = 1;
    $user = getAuthenticatedUser($pdo);
    if ($user && $user['role'] === 'student') {
        $studentId = (int)$user['id'];
    } else {
        $studentIdHeader = getHeader('x-student-id');
        if ($studentIdHeader) {
            $studentId = (int)$studentIdHeader;
        } else if ($user) {
            $studentId = (int)$user['id'];
        }
    }
    
    $data = [
        'student_id' => $studentId,
        'pass_type' => $body['passType'] ?? 'leave',
        'leave_type' => $body['leaveType'],
        'reason' => $body['reason'],
        'ai_generated_letter' => $body['aiGeneratedLetter'] ?? null,
        'destination' => $body['destination'],
        'from_date' => date('Y-m-d', strtotime($body['fromDate'])),
        'to_date' => date('Y-m-d', strtotime($body['toDate'])),
        'status' => 'pending',
        'current_step' => 'warden'
    ];
    
    $cols = implode(", ", array_keys($data));
    $placeholders = implode(", ", array_fill(0, count($data), "?"));
    
    $stmt = $pdo->prepare("INSERT INTO leaves ($cols) VALUES ($placeholders)");
    $stmt->execute(array_values($data));
    $leaveId = $pdo->lastInsertId();
    
    // Notify warden
    $stmt = $pdo->prepare("SELECT id FROM users WHERE role = 'warden'");
    $stmt->execute();
    $wardens = $stmt->fetchAll();
    foreach ($wardens as $w) {
        $stmtN = $pdo->prepare("INSERT INTO notifications (user_id, type, title, message, is_read, leave_id) VALUES (?, ?, ?, ?, ?, ?)");
        $stmtN->execute([
            $w['id'],
            'leave_submitted',
            'New Leave Request',
            "A student has applied for leave to " . $data['destination'],
            0,
            $leaveId
        ]);
    }
    
    // Fetch newly created leave with student details
    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
    $stmt->execute([$leaveId]);
    $leave = $stmt->fetch();
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$studentId]);
    $student = $stmt->fetch();
    $leave['student'] = sanitizeUser($student);
    
    http_response_code(201);
    echo json_encode(convertKeys($leave, 'camel'));
    exit;
}

// 13. Leaves: Bulk Approve
if ($method === 'POST' && $path === '/leaves/bulk-approve') {
    $leaveIds = $body['leaveIds'] ?? [];
    $action = $body['action'] ?? 'approve';
    $remarks = $body['remarks'] ?? null;
    
    $succeeded = 0;
    $failed = 0;
    
    foreach ($leaveIds as $id) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
            $stmt->execute([$id]);
            $leave = $stmt->fetch();
            if (!$leave) { $failed++; continue; }
            
            if ($action === 'approve') {
                $newStatus = $leave['status'];
                $newStep = $leave['current_step'];
                $updateFields = [];
                
                switch ($leave['current_step']) {
                    case 'warden':
                        if ($leave['pass_type'] === 'outing') {
                            $newStatus = 'warden_approved'; $newStep = 'principal';
                        } else {
                            $newStatus = 'warden_approved'; $newStep = 'tutor';
                        }
                        $updateFields = ['warden_remarks' => $remarks, 'status' => $newStatus, 'current_step' => $newStep];
                        break;
                    case 'tutor':
                        if ($leave['pass_type'] === 'outing') { $failed++; continue 2; }
                        $newStatus = 'tutor_approved'; $newStep = 'hod';
                        $updateFields = ['tutor_remarks' => $remarks, 'status' => $newStatus, 'current_step' => $newStep];
                        break;
                    case 'hod':
                        if ($leave['pass_type'] === 'outing') { $failed++; continue 2; }
                        $newStatus = 'hod_approved'; $newStep = 'principal';
                        $updateFields = ['hod_remarks' => $remarks, 'status' => $newStatus, 'current_step' => $newStep];
                        break;
                    case 'principal':
                        if ($leave['pass_type'] === 'outing') {
                            $newStatus = 'fully_approved'; $newStep = 'completed';
                        } else {
                            $newStatus = 'principal_approved'; $newStep = 'warden_final';
                        }
                        $updateFields = ['principal_remarks' => $remarks, 'status' => $newStatus, 'current_step' => $newStep];
                        break;
                    case 'warden_final':
                        if ($leave['pass_type'] === 'outing') { $failed++; continue 2; }
                        $newStatus = 'fully_approved'; $newStep = 'completed';
                        $finalRemarks = $leave['warden_remarks'] ? $leave['warden_remarks'] . " | Final: " . $remarks : $remarks;
                        $updateFields = ['warden_remarks' => $finalRemarks, 'status' => $newStatus, 'current_step' => $newStep];
                        break;
                    default:
                        $failed++; continue 2;
                }
                
                $sets = [];
                $params = [];
                foreach ($updateFields as $col => $val) {
                    $sets[] = "$col = ?";
                    $params[] = $val;
                }
                $params[] = $id;
                $stmt = $pdo->prepare("UPDATE leaves SET " . implode(", ", $sets) . " WHERE id = ?");
                $stmt->execute($params);
                
                if ($newStatus !== 'fully_approved') {
                    $stmtS = $pdo->prepare("SELECT name FROM users WHERE id = ?");
                    $stmtS->execute([$leave['student_id']]);
                    $sName = $stmtS->fetchColumn() ?: 'Student';
                    notifyNextStepUsers($pdo, $id, $newStep, $sName, $leave['destination']);
                }
                
                if ($newStatus === 'fully_approved') {
                    $year = date('Y');
                    $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM outpasses WHERE created_at >= ?");
                    $stmtCount->execute(["$year-01-01 00:00:00"]);
                    $existingCount = (int)$stmtCount->fetchColumn();
                    
                    $outpassDetails = generateOutpassCode($id, $leave['student_id'], $existingCount + 1);
                    
                    $stmtStaff = $pdo->prepare("SELECT name, role FROM users WHERE role IN ('tutor', 'hod', 'principal', 'warden')");
                    $stmtStaff->execute();
                    $staffUsers = $stmtStaff->fetchAll();
                    $staffRoles = [];
                    foreach ($staffUsers as $su) {
                        $staffRoles[$su['role']] = $su['name'];
                    }
                    
                    $nowStr = date('c');
                    if ($leave['pass_type'] === 'outing') {
                        $staffDetails = json_encode([
                            'tutor' => ['name' => 'N/A', 'designation' => 'Class Tutor', 'approvedAt' => 'N/A'],
                            'hod' => ['name' => 'N/A', 'designation' => 'Head of Department', 'approvedAt' => 'N/A'],
                            'principal' => ['name' => $staffRoles['principal'] ?? 'Principal', 'designation' => 'Principal', 'approvedAt' => $nowStr],
                            'warden' => ['name' => $staffRoles['warden'] ?? 'Warden', 'designation' => 'Hostel Warden', 'approvedAt' => $nowStr]
                        ]);
                    } else {
                        $staffDetails = json_encode([
                            'tutor' => ['name' => $staffRoles['tutor'] ?? 'Tutor', 'designation' => 'Class Tutor', 'approvedAt' => $nowStr],
                            'hod' => ['name' => $staffRoles['hod'] ?? 'HOD', 'designation' => 'Head of Department', 'approvedAt' => $nowStr],
                            'principal' => ['name' => $staffRoles['principal'] ?? 'Principal', 'designation' => 'Principal', 'approvedAt' => $nowStr],
                            'warden' => ['name' => $staffRoles['warden'] ?? 'Warden', 'designation' => 'Hostel Warden', 'approvedAt' => $nowStr]
                        ]);
                    }
                    
                    $stmtInsertOutpass = $pdo->prepare("INSERT INTO outpasses (leave_id, student_id, outpass_code, gate_pass_number, qr_data, staff_details, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    $stmtInsertOutpass->execute([
                        $id,
                        $leave['student_id'],
                        $outpassDetails['code'],
                        $outpassDetails['gatePassNumber'],
                        $outpassDetails['qrData'],
                        $staffDetails,
                        'generated'
                    ]);
                    $outpassId = $pdo->lastInsertId();
                    
                    $stmtUpdateLeave = $pdo->prepare("UPDATE leaves SET outpass_id = ? WHERE id = ?");
                    $stmtUpdateLeave->execute([$outpassId, $id]);
                    
                    if ($leave['pass_type'] === 'outing') {
                        $stmtS = $pdo->prepare("SELECT name, parent_phone, parent_name FROM users WHERE id = ?");
                        $stmtS->execute([$leave['student_id']]);
                        $sInfo = $stmtS->fetch();
                        if ($sInfo && $sInfo['parent_phone']) {
                            $stmtParent = $pdo->prepare("INSERT INTO notifications (user_id, type, title, message, is_read, leave_id) VALUES (?, 'parent_notified', 'Parent Notified (SMS)', ?, 0, ?)");
                            $stmtParent->execute([
                                $leave['student_id'],
                                "SMS sent to " . ($sInfo['parent_name'] ?? 'Parent') . " (" . $sInfo['parent_phone'] . "): Your ward " . $sInfo['name'] . " has been approved for an outing pass to " . $leave['destination'] . ".",
                                $id
                            ]);
                        }
                    }
                }
            } else {
                $stmt = $pdo->prepare("UPDATE leaves SET status = 'rejected', current_step = 'rejected', warden_remarks = ? WHERE id = ?");
                $stmt->execute([$remarks ?: 'Bulk rejected', $id]);
            }
            $succeeded++;
        } catch (Exception $ex) {
            $failed++;
        }
    }
    echo json_encode(['processed' => count($leaveIds), 'succeeded' => $succeeded, 'failed' => $failed]);
    exit;
}

// 14. Leaves: Get Individual
if ($method === 'GET' && preg_match('#^/leaves/(?P<id>\d+)$#', $path, $matches)) {
    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $leave = $stmt->fetch();
    if (!$leave) {
        http_response_code(404);
        echo json_encode(["error" => "Leave not found"]);
        exit;
    }
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$leave['student_id']]);
    $student = $stmt->fetch();
    $leave['student'] = sanitizeUser($student);
    
    echo json_encode(convertKeys($leave, 'camel'));
    exit;
}

// 15. Leaves: Patch/Update
if ($method === 'PATCH' && preg_match('#^/leaves/(?P<id>\d+)$#', $path, $matches)) {
    $data = convertKeys($body, 'snake');
    if (isset($data['from_date'])) {
        $data['from_date'] = date('Y-m-d', strtotime($data['from_date']));
    }
    if (isset($data['to_date'])) {
        $data['to_date'] = date('Y-m-d', strtotime($data['to_date']));
    }
    
    if (!empty($data)) {
        $sets = [];
        $params = [];
        foreach ($data as $col => $val) {
            $sets[] = "$col = ?";
            $params[] = $val;
        }
        $params[] = $matches['id'];
        
        $sql = "UPDATE leaves SET " . implode(", ", $sets) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }
    
    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $leave = $stmt->fetch();
    if (!$leave) {
        http_response_code(404);
        echo json_encode(["error" => "Leave not found"]);
        exit;
    }
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$leave['student_id']]);
    $student = $stmt->fetch();
    $leave['student'] = sanitizeUser($student);
    
    echo json_encode(convertKeys($leave, 'camel'));
    exit;
}

// 16. Leaves: Delete
if ($method === 'DELETE' && preg_match('#^/leaves/(?P<id>\d+)$#', $path, $matches)) {
    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $leave = $stmt->fetch();
    if (!$leave) {
        http_response_code(404);
        echo json_encode(["error" => "Leave not found"]);
        exit;
    }
    $stmt = $pdo->prepare("UPDATE leaves SET status = 'cancelled' WHERE id = ?");
    $stmt->execute([$matches['id']]);
    http_response_code(204);
    exit;
}

// 17. Leaves: Approve Stage
if ($method === 'POST' && preg_match('#^/leaves/(?P<id>\d+)/approve$#', $path, $matches)) {
    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $leave = $stmt->fetch();
    if (!$leave) {
        http_response_code(404);
        echo json_encode(["error" => "Leave not found"]);
        exit;
    }
    
    $remarks = $body['remarks'] ?? null;
    $newStatus = $leave['status'];
    $newStep = $leave['current_step'];
    $updateFields = [];
    
    switch ($leave['current_step']) {
        case 'warden':
            if ($leave['pass_type'] === 'outing') {
                $newStatus = 'warden_approved'; $newStep = 'principal';
            } else {
                $newStatus = 'warden_approved'; $newStep = 'tutor';
            }
            $updateFields = ['warden_remarks' => $remarks, 'status' => $newStatus, 'current_step' => $newStep];
            break;
        case 'tutor':
            if ($leave['pass_type'] === 'outing') {
                http_response_code(400);
                echo json_encode(["error" => "Outing pass does not require tutor approval"]);
                exit;
            }
            $newStatus = 'tutor_approved'; $newStep = 'hod';
            $updateFields = ['tutor_remarks' => $remarks, 'status' => $newStatus, 'current_step' => $newStep];
            break;
        case 'hod':
            if ($leave['pass_type'] === 'outing') {
                http_response_code(400);
                echo json_encode(["error" => "Outing pass does not require HOD approval"]);
                exit;
            }
            $newStatus = 'hod_approved'; $newStep = 'principal';
            $updateFields = ['hod_remarks' => $remarks, 'status' => $newStatus, 'current_step' => $newStep];
            break;
        case 'principal':
            if ($leave['pass_type'] === 'outing') {
                $newStatus = 'fully_approved'; $newStep = 'completed';
            } else {
                $newStatus = 'principal_approved'; $newStep = 'warden_final';
            }
            $updateFields = ['principal_remarks' => $remarks, 'status' => $newStatus, 'current_step' => $newStep];
            break;
        case 'warden_final':
            if ($leave['pass_type'] === 'outing') {
                http_response_code(400);
                echo json_encode(["error" => "Outing pass does not require final warden approval"]);
                exit;
            }
            $newStatus = 'fully_approved'; $newStep = 'completed';
            $finalRemarks = $leave['warden_remarks'] ? $leave['warden_remarks'] . " | Final: " . $remarks : $remarks;
            $updateFields = ['warden_remarks' => $finalRemarks, 'status' => $newStatus, 'current_step' => $newStep];
            break;
        default:
            http_response_code(400);
            echo json_encode(["error" => "Leave is not in an approvable state"]);
            exit;
    }
    
    $sets = [];
    $params = [];
    foreach ($updateFields as $col => $val) {
        $sets[] = "$col = ?";
        $params[] = $val;
    }
    $params[] = $matches['id'];
    $stmt = $pdo->prepare("UPDATE leaves SET " . implode(", ", $sets) . " WHERE id = ?");
    $stmt->execute($params);
    
    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $updatedLeave = $stmt->fetch();
    
    if ($newStatus === 'fully_approved') {
        $year = date('Y');
        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM outpasses WHERE created_at >= ?");
        $stmtCount->execute(["$year-01-01 00:00:00"]);
        $existingCount = (int)$stmtCount->fetchColumn();
        
        $outpassDetails = generateOutpassCode($updatedLeave['id'], $updatedLeave['student_id'], $existingCount + 1);
        
        $stmtStaff = $pdo->prepare("SELECT name, role FROM users WHERE role IN ('tutor', 'hod', 'principal', 'warden')");
        $stmtStaff->execute();
        $staffUsers = $stmtStaff->fetchAll();
        $staffRoles = [];
        foreach ($staffUsers as $su) {
            $staffRoles[$su['role']] = $su['name'];
        }
        
        $nowStr = date('c');
        if ($updatedLeave['pass_type'] === 'outing') {
            $staffDetails = json_encode([
                'tutor' => ['name' => 'N/A', 'designation' => 'Class Tutor', 'approvedAt' => 'N/A'],
                'hod' => ['name' => 'N/A', 'designation' => 'Head of Department', 'approvedAt' => 'N/A'],
                'principal' => ['name' => $staffRoles['principal'] ?? 'Principal', 'designation' => 'Principal', 'approvedAt' => $nowStr],
                'warden' => ['name' => $staffRoles['warden'] ?? 'Warden', 'designation' => 'Hostel Warden', 'approvedAt' => $nowStr]
            ]);
        } else {
            $staffDetails = json_encode([
                'tutor' => ['name' => $staffRoles['tutor'] ?? 'Tutor', 'designation' => 'Class Tutor', 'approvedAt' => $nowStr],
                'hod' => ['name' => $staffRoles['hod'] ?? 'HOD', 'designation' => 'Head of Department', 'approvedAt' => $nowStr],
                'principal' => ['name' => $staffRoles['principal'] ?? 'Principal', 'designation' => 'Principal', 'approvedAt' => $nowStr],
                'warden' => ['name' => $staffRoles['warden'] ?? 'Warden', 'designation' => 'Hostel Warden', 'approvedAt' => $nowStr]
            ]);
        }
        
        $stmtInsertOutpass = $pdo->prepare("INSERT INTO outpasses (leave_id, student_id, outpass_code, gate_pass_number, qr_data, staff_details, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmtInsertOutpass->execute([
            $updatedLeave['id'],
            $updatedLeave['student_id'],
            $outpassDetails['code'],
            $outpassDetails['gatePassNumber'],
            $outpassDetails['qrData'],
            $staffDetails,
            'generated'
        ]);
        $outpassId = $pdo->lastInsertId();
        
        $stmtUpdateLeave = $pdo->prepare("UPDATE leaves SET outpass_id = ? WHERE id = ?");
        $stmtUpdateLeave->execute([$outpassId, $updatedLeave['id']]);
        $updatedLeave['outpass_id'] = $outpassId;
        
        $stmtN = $pdo->prepare("INSERT INTO notifications (user_id, type, title, message, is_read, leave_id, outpass_id) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmtN->execute([
            $updatedLeave['student_id'],
            'outpass_generated',
            'Outpass Ready!',
            'Your leave has been fully approved and your digital outpass is ready.',
            0,
            $updatedLeave['id'],
            $outpassId
        ]);
        
        if ($updatedLeave['pass_type'] === 'outing') {
            $stmtS = $pdo->prepare("SELECT name, parent_phone, parent_name FROM users WHERE id = ?");
            $stmtS->execute([$updatedLeave['student_id']]);
            $sInfo = $stmtS->fetch();
            if ($sInfo && $sInfo['parent_phone']) {
                $stmtParent = $pdo->prepare("INSERT INTO notifications (user_id, type, title, message, is_read, leave_id) VALUES (?, 'parent_notified', 'Parent Notified (SMS)', ?, 0, ?)");
                $stmtParent->execute([
                    $updatedLeave['student_id'],
                    "SMS sent to " . ($sInfo['parent_name'] ?? 'Parent') . " (" . $sInfo['parent_phone'] . "): Your ward " . $sInfo['name'] . " has been approved for an outing pass to " . $updatedLeave['destination'] . ".",
                    $updatedLeave['id']
                ]);
            }
        }
    } else {
        $stmtN = $pdo->prepare("INSERT INTO notifications (user_id, type, title, message, is_read, leave_id) VALUES (?, ?, ?, ?, ?, ?)");
        $stmtN->execute([
            $updatedLeave['student_id'],
            'leave_approved',
            'Leave Approved',
            "Your leave request has been approved at the " . $leave['current_step'] . " stage.",
            0,
            $updatedLeave['id']
        ]);
        
        $stmtS = $pdo->prepare("SELECT name FROM users WHERE id = ?");
        $stmtS->execute([$updatedLeave['student_id']]);
        $sName = $stmtS->fetchColumn() ?: 'Student';
        notifyNextStepUsers($pdo, $updatedLeave['id'], $updatedLeave['current_step'], $sName, $updatedLeave['destination']);
    }
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$updatedLeave['student_id']]);
    $student = $stmt->fetch();
    $updatedLeave['student'] = sanitizeUser($student);
    
    echo json_encode(convertKeys($updatedLeave, 'camel'));
    exit;
}

// 18. Leaves: Reject Stage
if ($method === 'POST' && preg_match('#^/leaves/(?P<id>\d+)/reject$#', $path, $matches)) {
    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $leave = $stmt->fetch();
    if (!$leave) {
        http_response_code(404);
        echo json_encode(["error" => "Leave not found"]);
        exit;
    }
    
    $remarks = $body['remarks'] ?? null;
    $remarksCol = $leave['current_step'] === 'warden_final' ? 'warden_remarks' : $leave['current_step'] . '_remarks';
    
    $stmt = $pdo->prepare("UPDATE leaves SET status = 'rejected', current_step = 'rejected', $remarksCol = ? WHERE id = ?");
    $stmt->execute([$remarks, $matches['id']]);
    
    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $updatedLeave = $stmt->fetch();
    
    $stmtN = $pdo->prepare("INSERT INTO notifications (user_id, type, title, message, is_read, leave_id) VALUES (?, ?, ?, ?, ?, ?)");
    $stmtN->execute([
        $leave['student_id'],
        'leave_rejected',
        'Leave Rejected',
        "Your leave request was rejected: " . $remarks,
        0,
        $leave['id']
    ]);
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$updatedLeave['student_id']]);
    $student = $stmt->fetch();
    $updatedLeave['student'] = sanitizeUser($student);
    
    echo json_encode(convertKeys($updatedLeave, 'camel'));
    exit;
}

// 19. Leaves: Record Parent Call
if ($method === 'POST' && preg_match('#^/leaves/(?P<id>\d+)/parent-call$#', $path, $matches)) {
    $callStatus = $body['callStatus'];
    $notes = $body['notes'] ?? null;
    
    $stmt = $pdo->prepare("UPDATE leaves SET parent_call_status = ?, parent_call_notes = ? WHERE id = ?");
    $stmt->execute([$callStatus, $notes, $matches['id']]);
    
    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $updatedLeave = $stmt->fetch();
    if (!$updatedLeave) {
        http_response_code(404);
        echo json_encode(["error" => "Leave not found"]);
        exit;
    }
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$updatedLeave['student_id']]);
    $student = $stmt->fetch();
    $updatedLeave['student'] = sanitizeUser($student);
    
    echo json_encode(convertKeys($updatedLeave, 'camel'));
    exit;
}

// 20. Outpasses: List
if ($method === 'GET' && $path === '/outpasses') {
    $status = $_GET['status'] ?? null;
    $studentId = $_GET['studentId'] ?? null;
    
    $sql = "SELECT * FROM outpasses";
    $params = [];
    $conds = [];
    if ($status) {
        $conds[] = "status = ?";
        $params[] = $status;
    }
    if ($studentId) {
        $conds[] = "student_id = ?";
        $params[] = (int)$studentId;
    }
    if ($conds) {
        $sql .= " WHERE " . implode(" AND ", $conds);
    }
    $sql .= " ORDER BY created_at ASC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $outpasses = $stmt->fetchAll();
    
    $withDetails = [];
    foreach ($outpasses as $o) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$o['student_id']]);
        $student = $stmt->fetch();
        $o['student'] = sanitizeUser($student);
        
        $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
        $stmt->execute([$o['leave_id']]);
        $leave = $stmt->fetch();
        if ($leave && $student) {
            $leave['student'] = sanitizeUser($student);
        }
        $o['leave'] = convertKeys($leave, 'camel');
        
        $withDetails[] = convertKeys($o, 'camel');
    }
    echo json_encode($withDetails);
    exit;
}

// 21. Outpasses: Lookup
if ($method === 'GET' && $path === '/outpasses/lookup') {
    $outpassCode = $_GET['outpassCode'] ?? null;
    $registerNumber = $_GET['registerNumber'] ?? null;
    $studentName = $_GET['studentName'] ?? null;
    
    $results = [];
    if ($outpassCode) {
        $stmt = $pdo->prepare("SELECT * FROM outpasses WHERE outpass_code = ? ORDER BY id DESC");
        $stmt->execute([$outpassCode]);
        $results = $stmt->fetchAll();
    } else if ($registerNumber || $studentName) {
        $conds = [];
        $params = [];
        if ($registerNumber) {
            $conds[] = "register_number = ?";
            $params[] = $registerNumber;
        }
        if ($studentName) {
            $conds[] = "name LIKE ?";
            $params[] = "%$studentName%";
        }
        $stmt = $pdo->prepare("SELECT id FROM users WHERE " . implode(" AND ", $conds));
        $stmt->execute($params);
        $students = $stmt->fetchAll();
        $studentIds = array_column($students, 'id');
        
        if ($studentIds) {
            $inQuery = implode(',', array_fill(0, count($studentIds), '?'));
            $stmt = $pdo->prepare("SELECT * FROM outpasses WHERE student_id IN ($inQuery) ORDER BY id DESC");
            $stmt->execute($studentIds);
            $results = $stmt->fetchAll();
        }
    }
    
    $withDetails = [];
    foreach ($results as $o) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$o['student_id']]);
        $student = $stmt->fetch();
        $o['student'] = sanitizeUser($student);
        
        $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
        $stmt->execute([$o['leave_id']]);
        $leave = $stmt->fetch();
        if ($leave && $student) {
            $leave['student'] = sanitizeUser($student);
        }
        $o['leave'] = convertKeys($leave, 'camel');
        
        $withDetails[] = convertKeys($o, 'camel');
    }
    echo json_encode($withDetails);
    exit;
}

// 22. Outpasses: Get Individual
if ($method === 'GET' && preg_match('#^/outpasses/(?P<id>\d+)$#', $path, $matches)) {
    $stmt = $pdo->prepare("SELECT * FROM outpasses WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $o = $stmt->fetch();
    if (!$o) {
        http_response_code(404);
        echo json_encode(["error" => "Outpass not found"]);
        exit;
    }
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$o['student_id']]);
    $student = $stmt->fetch();
    $o['student'] = sanitizeUser($student);
    
    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
    $stmt->execute([$o['leave_id']]);
    $leave = $stmt->fetch();
    if ($leave && $student) {
        $leave['student'] = sanitizeUser($student);
    }
    $o['leave'] = convertKeys($leave, 'camel');
    
    echo json_encode(convertKeys($o, 'camel'));
    exit;
}

// 23. Outpasses: Verify (Gate exit)
if ($method === 'POST' && preg_match('#^/outpasses/(?P<id>\d+)/verify$#', $path, $matches)) {
    $gateLocation = $body['gateLocation'] ?? 'Main Gate';
    $nowStr = date('Y-m-d H:i:s');
    
    $stmt = $pdo->prepare("UPDATE outpasses SET status = 'verified', exit_time = ?, gate_location = ? WHERE id = ?");
    $stmt->execute([$nowStr, $gateLocation, $matches['id']]);
    
    $stmt = $pdo->prepare("SELECT * FROM outpasses WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $updated = $stmt->fetch();
    if (!$updated) {
        http_response_code(404);
        echo json_encode(["error" => "Outpass not found"]);
        exit;
    }
    
    $stmt = $pdo->prepare("SELECT id FROM users WHERE role = 'warden'");
    $stmt->execute();
    $wardens = $stmt->fetchAll();
    
    $stmtS = $pdo->prepare("SELECT name, register_number FROM users WHERE id = ?");
    $stmtS->execute([$updated['student_id']]);
    $student = $stmtS->fetch();
    
    foreach ($wardens as $w) {
        $stmtN = $pdo->prepare("INSERT INTO notifications (user_id, type, title, message, is_read, outpass_id) VALUES (?, ?, ?, ?, ?, ?)");
        $stmtN->execute([
            $w['id'],
            'exit_recorded',
            'Student Exit Recorded',
            ($student['name'] ?? 'Student') . ' (' . ($student['register_number'] ?? '') . ') exited at ' . $gateLocation,
            0,
            $updated['id']
        ]);
    }
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$updated['student_id']]);
    $s = $stmt->fetch();
    $updated['student'] = sanitizeUser($s);
    
    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
    $stmt->execute([$updated['leave_id']]);
    $leave = $stmt->fetch();
    if ($leave && $s) {
        $leave['student'] = sanitizeUser($s);
    }
    $updated['leave'] = convertKeys($leave, 'camel');
    
    echo json_encode(convertKeys($updated, 'camel'));
    exit;
}

// 24. Outpasses: Return (Gate return)
if ($method === 'POST' && preg_match('#^/outpasses/(?P<id>\d+)/return$#', $path, $matches)) {
    $nowStr = date('Y-m-d H:i:s');
    $stmt = $pdo->prepare("UPDATE outpasses SET status = 'returned', return_time = ? WHERE id = ?");
    $stmt->execute([$nowStr, $matches['id']]);
    
    $stmt = $pdo->prepare("SELECT * FROM outpasses WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $updated = $stmt->fetch();
    if (!$updated) {
        http_response_code(404);
        echo json_encode(["error" => "Outpass not found"]);
        exit;
    }
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$updated['student_id']]);
    $s = $stmt->fetch();
    $updated['student'] = sanitizeUser($s);
    
    $stmt = $pdo->prepare("SELECT * FROM leaves WHERE id = ?");
    $stmt->execute([$updated['leave_id']]);
    $leave = $stmt->fetch();
    if ($leave && $s) {
        $leave['student'] = sanitizeUser($s);
    }
    $updated['leave'] = convertKeys($leave, 'camel');
    
    echo json_encode(convertKeys($updated, 'camel'));
    exit;
}

// 25. Notifications: List
if ($method === 'GET' && $path === '/notifications') {
    checkAndAlertOverdueReturns($pdo);
    $userId = null;
    $user = getAuthenticatedUser($pdo);
    if ($user) {
        $userId = (int)$user['id'];
    } else {
        $userIdHeader = getHeader('x-user-id');
        $userId = $userIdHeader ? (int)$userIdHeader : null;
    }
    
    if ($userId) {
        $stmt = $pdo->prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$userId]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM notifications ORDER BY created_at DESC");
        $stmt->execute();
    }
    $notifications = $stmt->fetchAll();
    echo json_encode(convertKeys($notifications, 'camel'));
    exit;
}

// 26. Notifications: Mark read
if ($method === 'PATCH' && preg_match('#^/notifications/(?P<id>\d+)/read$#', $path, $matches)) {
    $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id = ?");
    $stmt->execute([$matches['id']]);
    
    $stmt = $pdo->prepare("SELECT * FROM notifications WHERE id = ?");
    $stmt->execute([$matches['id']]);
    $n = $stmt->fetch();
    if (!$n) {
        http_response_code(404);
        echo json_encode(["error" => "Notification not found"]);
        exit;
    }
    echo json_encode(convertKeys($n, 'camel'));
    exit;
}

// 27. Notifications: Mark all read
if ($method === 'POST' && $path === '/notifications/read-all') {
    $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1");
    $stmt->execute();
    echo json_encode(['success' => true]);
    exit;
}

// 28. Dashboard: Stats
if ($method === 'GET' && $path === '/dashboard/stats') {
    checkAndAlertOverdueReturns($pdo);
    $students = $pdo->query("SELECT * FROM users WHERE role = 'student'")->fetchAll();
    $leaves = $pdo->query("SELECT * FROM leaves")->fetchAll();
    $outpasses = $pdo->query("SELECT * FROM outpasses")->fetchAll();
    
    $totalStudents = count($students);
    $studentsOnLeave = 0;
    $studentsReturned = 0;
    $pendingReturns = 0;
    
    foreach ($outpasses as $o) {
        if ($o['status'] === 'verified') {
            $studentsOnLeave++;
            $pendingReturns++;
        } else if ($o['status'] === 'returned') {
            $studentsReturned++;
        }
    }
    
    $pendingApprovals = 0;
    $pendingWarden = 0;
    $pendingTutor = 0;
    $pendingHod = 0;
    $pendingPrincipal = 0;
    
    foreach ($leaves as $l) {
        if (!in_array($l['status'], ['fully_approved', 'rejected', 'cancelled'])) {
            $pendingApprovals++;
        }
        if ($l['current_step'] === 'warden' && $l['status'] === 'pending') {
            $pendingWarden++;
        }
        if ($l['current_step'] === 'tutor') {
            $pendingTutor++;
        }
        if ($l['current_step'] === 'hod') {
            $pendingHod++;
        }
        if ($l['current_step'] === 'principal') {
            $pendingPrincipal++;
        }
    }
    
    $today = date('Y-m-d 00:00:00');
    $todayApproved = 0;
    $todayRejected = 0;
    foreach ($leaves as $l) {
        if ($l['updated_at'] >= $today) {
            if ($l['status'] === 'fully_approved') $todayApproved++;
            if ($l['status'] === 'rejected') $todayRejected++;
        }
    }
    
    $occupancyPercent = $totalStudents > 0 ? (int)round((($totalStudents - $studentsOnLeave) / $totalStudents) * 100) : 100;
    
    echo json_encode([
        'studentsOnLeave' => $studentsOnLeave,
        'studentsReturned' => $studentsReturned,
        'pendingApprovals' => $pendingApprovals,
        'totalStudents' => $totalStudents,
        'occupancyPercent' => $occupancyPercent,
        'pendingWarden' => $pendingWarden,
        'pendingTutor' => $pendingTutor,
        'pendingHod' => $pendingHod,
        'pendingPrincipal' => $pendingPrincipal,
        'pendingReturns' => $pendingReturns,
        'todayApproved' => $todayApproved,
        'todayRejected' => $todayRejected
    ]);
    exit;
}

// 29. Dashboard: Activity log
if ($method === 'GET' && $path === '/dashboard/activity') {
    $stmt = $pdo->query("SELECT * FROM notifications ORDER BY created_at DESC LIMIT 20");
    $recent = $stmt->fetchAll();
    
    $withStudents = [];
    foreach ($recent as $n) {
        $studentName = null;
        $registerNumber = null;
        if ($n['leave_id']) {
            $stmtL = $pdo->prepare("SELECT student_id FROM leaves WHERE id = ?");
            $stmtL->execute([$n['leave_id']]);
            $leave = $stmtL->fetch();
            if ($leave) {
                $stmtS = $pdo->prepare("SELECT name, register_number FROM users WHERE id = ?");
                $stmtS->execute([$leave['student_id']]);
                $student = $stmtS->fetch();
                if ($student) {
                    $studentName = $student['name'];
                    $registerNumber = $student['register_number'];
                }
            }
        }
        $withStudents[] = [
            'id' => (int)$n['id'],
            'type' => $n['type'],
            'description' => $n['message'],
            'studentName' => $studentName,
            'registerNumber' => $registerNumber,
            'timestamp' => $n['created_at']
        ];
    }
    echo json_encode($withStudents);
    exit;
}

// 30. Dashboard: Occupancy statistics
if ($method === 'GET' && $path === '/dashboard/occupancy') {
    $students = $pdo->query("
        SELECT u.id, u.department_id, d.name AS department 
        FROM users u 
        LEFT JOIN departments d ON u.department_id = d.id 
        WHERE u.role = 'student'
    ")->fetchAll();
    $outpasses = $pdo->query("SELECT student_id FROM outpasses WHERE status = 'verified'")->fetchAll();
    
    $totalCapacity = count($students);
    $onLeave = count($outpasses);
    $currentlyPresent = $totalCapacity - $onLeave;
    $occupancyPercent = $totalCapacity > 0 ? (int)round(($currentlyPresent / $totalCapacity) * 100) : 100;
    
    $departments = array_unique(array_filter(array_column($students, 'department')));
    $departmentBreakdown = [];
    
    foreach ($departments as $dept) {
        $deptStudents = array_filter($students, function($s) use ($dept) { return $s['department'] === $dept; });
        $deptStudentIds = array_column($deptStudents, 'id');
        $deptOnLeave = count(array_filter($outpasses, function($o) use ($deptStudentIds) { return in_array($o['student_id'], $deptStudentIds); }));
        
        $departmentBreakdown[] = [
            'department' => $dept,
            'total' => count($deptStudents),
            'present' => count($deptStudents) - $deptOnLeave,
            'onLeave' => $deptOnLeave
        ];
    }
    
    echo json_encode([
        'totalCapacity' => $totalCapacity,
        'currentlyPresent' => $currentlyPresent,
        'currentlyAbsent' => $onLeave,
        'onLeave' => $onLeave,
        'occupancyPercent' => $occupancyPercent,
        'departmentBreakdown' => $departmentBreakdown
    ]);
    exit;
}

// 31. Dashboard: Monthly report
if ($method === 'GET' && $path === '/dashboard/monthly-report') {
    $month = isset($_GET['month']) ? (int)$_GET['month'] : (int)date('m');
    $year = isset($_GET['year']) ? (int)$_GET['year'] : (int)date('Y');
    
    $leaves = $pdo->query("SELECT status, created_at FROM leaves")->fetchAll();
    $daysInMonth = cal_days_in_month(CAL_GREGORIAN, $month, $year);
    $report = [];
    
    for ($day = 1; $day <= $daysInMonth; $day++) {
        $dateStr = $year . '-' . str_pad($month, 2, '0', STR_PAD_LEFT) . '-' . str_pad($day, 2, '0', STR_PAD_LEFT);
        $dayApproved = 0;
        $dayRejected = 0;
        $dayPending = 0;
        $dayTotal = 0;
        
        foreach ($leaves as $l) {
            $cDate = date('Y-m-d', strtotime($l['created_at']));
            if ($cDate === $dateStr) {
                $dayTotal++;
                if ($l['status'] === 'fully_approved') $dayApproved++;
                else if ($l['status'] === 'rejected') $dayRejected++;
                else if (!in_array($l['status'], ['fully_approved', 'rejected', 'cancelled'])) $dayPending++;
            }
        }
        
        $report[] = [
            'date' => $dateStr,
            'approved' => $dayApproved,
            'rejected' => $dayRejected,
            'pending' => $dayPending,
            'total' => $dayTotal
        ];
    }
    echo json_encode($report);
    exit;
}

// 32. Dashboard: Students currently outside
if ($method === 'GET' && $path === '/dashboard/students-outside') {
    checkAndAlertOverdueReturns($pdo);
    $outpasses = $pdo->query("SELECT * FROM outpasses WHERE status = 'verified'")->fetchAll();
    $today = date('Y-m-d');
    
    $withDetails = [];
    foreach ($outpasses as $o) {
        $stmtS = $pdo->prepare("
            SELECT u.name, u.register_number, u.hostel_room, d.name AS department 
            FROM users u 
            LEFT JOIN departments d ON u.department_id = d.id 
            WHERE u.id = ?
        ");
        $stmtS->execute([$o['student_id']]);
        $student = $stmtS->fetch();
        
        $stmtL = $pdo->prepare("SELECT destination, from_date, to_date, pass_type FROM leaves WHERE id = ?");
        $stmtL->execute([$o['leave_id']]);
        $leave = $stmtL->fetch();
        
        $isOverdue = false;
        if ($leave) {
            $todayStr = date('Y-m-d H:i:s');
            if ($leave['pass_type'] === 'outing') {
                $expectedTime = $leave['to_date'] . ' 18:00:00';
                if (strtotime($todayStr) > strtotime($expectedTime)) {
                    $isOverdue = true;
                }
            } else {
                $expectedTime = $leave['to_date'] . ' 23:59:59';
                if (strtotime($todayStr) > strtotime($expectedTime)) {
                    $isOverdue = true;
                }
            }
        }
        
        $withDetails[] = [
            'outpassId' => (int)$o['id'],
            'studentName' => $student['name'] ?? 'Unknown',
            'registerNumber' => $student['register_number'] ?? 'N/A',
            'department' => $student['department'] ?? null,
            'hostelRoom' => $student['hostel_room'] ?? null,
            'destination' => $leave['destination'] ?? 'Unknown',
            'exitTime' => $o['exit_time'] ? date('c', strtotime($o['exit_time'])) : date('c'),
            'fromDate' => $leave['from_date'] ?? $today,
            'toDate' => $leave['to_date'] ?? $today,
            'isOverdue' => $isOverdue
        ];
    }
    echo json_encode($withDetails);
    exit;
}

// 33. System: Clear History (Super Admin only)
if ($method === 'POST' && $path === '/system/clear-history') {
    $user = getAuthenticatedUser($pdo);
    if (!$user || $user['role'] !== 'super_admin') {
        http_response_code(403);
        echo json_encode(["error" => "Forbidden - Super Admin access only"]);
        exit;
    }
    
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");
    $pdo->exec("TRUNCATE TABLE outpasses;");
    $pdo->exec("TRUNCATE TABLE leaves;");
    $pdo->exec("TRUNCATE TABLE notifications;");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
    
    echo json_encode(["success" => true, "message" => "System history cleared successfully."]);
    exit;
}

// Fallback: Endpoint not found
http_response_code(404);
echo json_encode(["error" => "Endpoint not found: $method $path"]);
