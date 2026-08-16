import { mysqlTable, text, int, varchar, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { leavesTable } from "./leaves";

export const notificationLogsTable = mysqlTable("notification_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id),
  leaveId: int("leave_id").references(() => leavesTable.id),
  channel: mysqlEnum("channel", ["email", "sms", "whatsapp"]).notNull(),
  recipient: varchar("recipient", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const insertNotificationLogSchema = createInsertSchema(notificationLogsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;
export type NotificationLog = typeof notificationLogsTable.$inferSelect;
