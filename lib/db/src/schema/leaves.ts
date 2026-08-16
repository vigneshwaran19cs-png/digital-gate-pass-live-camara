import { mysqlTable, text, int, timestamp, date, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const leavesTable = mysqlTable("leaves", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("student_id").notNull().references(() => usersTable.id),
  passType: mysqlEnum("pass_type", ["hostel_leave", "outing_pass"]).notNull().default("hostel_leave"),
  leaveType: mysqlEnum("leave_type", [
    // Hostel Leave Categories
    "semester_holiday",
    "study_holiday",
    "diwali_holiday",
    "pongal_holiday",
    "christmas_holiday",
    "ramzan_holiday",
    "internship",
    "project_work",
    "family_function",
    "family_emergency",
    "marriage_function",
    "medical_leave",
    "hospital_visit",
    // Outing Pass Categories
    "hair_cut",
    "shopping",
    "atm_withdrawal",
    "bank_visit",
    "medical_checkup",
    "personal_work",
    // General
    "other",
    // Legacy support (to avoid crashes if old data exists)
    "home",
    "medical",
    "emergency",
    "personal",
    "educational"
  ]).notNull(),
  reason: text("reason").notNull(),
  aiGeneratedLetter: text("ai_generated_letter"),
  fromDate: date("from_date", { mode: "string" }).notNull(),
  toDate: date("to_date", { mode: "string" }).notNull(),
  destination: text("destination").notNull(),
  status: mysqlEnum("status", [
    "pending",
    "warden_approved",
    "tutor_approved",
    "hod_approved",
    "principal_approved",
    "fully_approved",
    "rejected",
    "cancelled",
  ]).notNull().default("pending"),
  currentStep: mysqlEnum("current_step", [
    "warden",
    "tutor",
    "hod",
    "principal",
    "warden_final",
    "completed",
    "rejected",
  ]).notNull().default("warden"),
  wardenRemarks: text("warden_remarks"),
  tutorRemarks: text("tutor_remarks"),
  hodRemarks: text("hod_remarks"),
  principalRemarks: text("principal_remarks"),
  parentCallStatus: mysqlEnum("parent_call_status", [
    "pending",
    "confirmed",
    "rejected",
    "not_reachable",
    "completed",
  ]),
  parentCallNotes: text("parent_call_notes"),
  outpassId: int("outpass_id"),
  riskScore: int("risk_score").default(0),
  riskLevel: mysqlEnum("risk_level", ["low", "medium", "high"]).default("low"),
  aiValidationNotes: text("ai_validation_notes"),
  medicalDocUrl: text("medical_doc_url"),
  fraudStatus: mysqlEnum("fraud_status", ["genuine", "suspicious", "manual_review"]).default("genuine"),
  fraudNotes: text("fraud_notes"),
  isEmergency: mysqlEnum("is_emergency", ["true", "false"]).default("false"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeaveSchema = createInsertSchema(leavesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLeave = z.infer<typeof insertLeaveSchema>;
export type Leave = typeof leavesTable.$inferSelect;
