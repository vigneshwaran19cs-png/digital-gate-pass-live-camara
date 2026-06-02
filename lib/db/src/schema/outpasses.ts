import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { leavesTable } from "./leaves";

export const outpassStatusEnum = pgEnum("outpass_status", [
  "generated",
  "verified",
  "returned",
  "expired",
]);

export const outpassesTable = pgTable("outpasses", {
  id: serial("id").primaryKey(),
  leaveId: integer("leave_id").notNull().references(() => leavesTable.id),
  studentId: integer("student_id").notNull().references(() => usersTable.id),
  outpassCode: text("outpass_code").notNull().unique(),
  qrData: text("qr_data").notNull(),
  status: outpassStatusEnum("status").notNull().default("generated"),
  exitTime: timestamp("exit_time", { withTimezone: true }),
  returnTime: timestamp("return_time", { withTimezone: true }),
  gateLocation: text("gate_location"),
  verifiedBy: integer("verified_by"),
  approvedByWarden: text("approved_by_warden"),
  approvedByTutor: text("approved_by_tutor"),
  approvedByHod: text("approved_by_hod"),
  approvedByPrincipal: text("approved_by_principal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOutpassSchema = createInsertSchema(outpassesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertOutpass = z.infer<typeof insertOutpassSchema>;
export type Outpass = typeof outpassesTable.$inferSelect;
