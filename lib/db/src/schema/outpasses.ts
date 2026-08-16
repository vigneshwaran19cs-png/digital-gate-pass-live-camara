import { mysqlTable, text, int, timestamp, mysqlEnum, varchar, datetime } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { leavesTable } from "./leaves";

export const outpassesTable = mysqlTable("outpasses", {
  id: int("id").autoincrement().primaryKey(),
  leaveId: int("leave_id").notNull().references(() => leavesTable.id),
  studentId: int("student_id").notNull().references(() => usersTable.id),
  outpassCode: varchar("outpass_code", { length: 255 }).notNull().unique(),
  gatePassNumber: varchar("gate_pass_number", { length: 255 }).unique(),
  qrData: text("qr_data").notNull(),
  staffDetails: text("staff_details"),
  status: mysqlEnum("status", [
    "generated",
    "verified",
    "returned",
    "expired",
  ]).notNull().default("generated"),
  exitTime: datetime("exit_time", { mode: "date" }),
  returnTime: datetime("return_time", { mode: "date" }),
  gateLocation: varchar("gate_location", { length: 255 }),
  verifiedBy: int("verified_by"),
  approvedByWarden: varchar("approved_by_warden", { length: 255 }),
  approvedByTutor: varchar("approved_by_tutor", { length: 255 }),
  approvedByHod: varchar("approved_by_hod", { length: 255 }),
  approvedByPrincipal: varchar("approved_by_principal", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const insertOutpassSchema = createInsertSchema(outpassesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOutpass = z.infer<typeof insertOutpassSchema>;
export type Outpass = typeof outpassesTable.$inferSelect;
