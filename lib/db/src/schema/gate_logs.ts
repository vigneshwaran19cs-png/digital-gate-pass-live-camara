import { mysqlTable, text, int, varchar, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { leavesTable } from "./leaves";

export const gateLogsTable = mysqlTable("gate_logs", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("student_id").notNull().references(() => usersTable.id),
  actionType: mysqlEnum("action_type", ["ENTRY", "EXIT"]).notNull(),
  verificationMethod: mysqlEnum("verification_method", ["FACE", "QR", "MANUAL"]).notNull().default("FACE"),
  confidenceScore: int("confidence_score").default(95),
  securityUserId: int("security_user_id").references(() => usersTable.id),
  leaveId: int("leave_id").references(() => leavesTable.id),
  gateName: varchar("gate_name", { length: 100 }).default("Main Gate 1"),
  capturedLivePhoto: text("captured_live_photo"),
  timestamp: timestamp("timestamp", { mode: "date" }).notNull().defaultNow(),
});

export const insertGateLogSchema = createInsertSchema(gateLogsTable).omit({
  id: true,
  timestamp: true,
});

export type InsertGateLog = z.infer<typeof insertGateLogSchema>;
export type GateLog = typeof gateLogsTable.$inferSelect;
