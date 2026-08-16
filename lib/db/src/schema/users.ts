import { mysqlTable, text, int, varchar, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { departmentsTable } from "./departments";
import { classesTable } from "./classes";

export const usersTable = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: mysqlEnum("role", [
    "student",
    "tutor",
    "hod",
    "principal",
    "warden",
    "security",
    "super_admin",
  ]).notNull(),
  
  // Common Fields
  phone: varchar("phone", { length: 20 }),
  departmentId: int("department_id").references(() => departmentsTable.id),

  // Student Fields
  registerNumber: varchar("register_number", { length: 100 }),
  classId: int("class_id").references(() => classesTable.id),
  hostelBlock: varchar("hostel_block", { length: 50 }),
  hostelRoom: varchar("hostel_room", { length: 50 }),
  parentName: varchar("parent_name", { length: 255 }),
  parentPhone: varchar("parent_phone", { length: 20 }),
  parentWhatsapp: varchar("parent_whatsapp", { length: 20 }),
  parentEmail: varchar("parent_email", { length: 255 }),
  address: text("address"),
  
  // Staff Fields
  designation: varchar("designation", { length: 255 }),

  // Face Enrollment & Identity Fields
  isFaceEnrolled: mysqlEnum("is_face_enrolled", ["true", "false"]).default("false"),
  faceEmbedding: text("face_embedding"),
  idCardUrl: text("id_card_url"),
  attendancePercentage: int("attendance_percentage").default(87),
  collegeType: varchar("college_type", { length: 100 }).default("Engineering"),

  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
