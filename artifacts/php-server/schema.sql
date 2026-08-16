-- MySQL Schema for Smart Hostel Leave & Digital Outpass Management System
-- Database: hostel_pass_manager

CREATE DATABASE IF NOT EXISTS `hostel_pass_manager` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `hostel_pass_manager`;

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  hod_id INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Classes Table
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

-- 3. Users Table
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

-- 4. Leaves Table
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

-- 5. Outpasses Table
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

-- 6. Notifications Table
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
