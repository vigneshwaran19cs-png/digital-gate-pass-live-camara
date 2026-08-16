import { mysqlTable, text, int, timestamp, varchar, json } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const activityLogsTable = mysqlTable("activity_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id),
  role: varchar("role", { length: 50 }).notNull(),
  action: varchar("action", { length: 255 }).notNull(),
  details: json("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  device: varchar("device", { length: 255 }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
