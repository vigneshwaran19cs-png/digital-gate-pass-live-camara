import { mysqlTable, text, int, timestamp, mysqlEnum, boolean, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const notificationsTable = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => usersTable.id),
  type: mysqlEnum("type", [
    "leave_submitted",
    "leave_approved",
    "leave_rejected",
    "outpass_generated",
    "exit_recorded",
    "return_reminder",
    "parent_notified",
    "bulk_action",
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  leaveId: int("leave_id"),
  outpassId: int("outpass_id"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
