import { pgTable, text, serial, timestamp, integer, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const leaveTypeEnum = pgEnum("leave_type", [
  "home",
  "medical",
  "emergency",
  "personal",
  "educational",
]);

export const leaveStatusEnum = pgEnum("leave_status", [
  "pending",
  "warden_approved",
  "tutor_approved",
  "hod_approved",
  "principal_approved",
  "fully_approved",
  "rejected",
  "cancelled",
]);

export const leaveStepEnum = pgEnum("leave_step", [
  "warden",
  "tutor",
  "hod",
  "principal",
  "completed",
  "rejected",
]);

export const parentCallStatusEnum = pgEnum("parent_call_status", [
  "pending",
  "confirmed",
  "rejected",
  "not_reachable",
  "completed",
]);

export const leavesTable = pgTable("leaves", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => usersTable.id),
  leaveType: leaveTypeEnum("leave_type").notNull(),
  reason: text("reason").notNull(),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  destination: text("destination").notNull(),
  status: leaveStatusEnum("status").notNull().default("pending"),
  currentStep: leaveStepEnum("current_step").notNull().default("warden"),
  wardenRemarks: text("warden_remarks"),
  tutorRemarks: text("tutor_remarks"),
  hodRemarks: text("hod_remarks"),
  principalRemarks: text("principal_remarks"),
  parentCallStatus: parentCallStatusEnum("parent_call_status"),
  parentCallNotes: text("parent_call_notes"),
  outpassId: integer("outpass_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeaveSchema = createInsertSchema(leavesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLeave = z.infer<typeof insertLeaveSchema>;
export type Leave = typeof leavesTable.$inferSelect;
