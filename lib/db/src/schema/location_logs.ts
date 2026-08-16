import { mysqlTable, text, int, varchar, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const locationLogsTable = mysqlTable("location_logs", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("student_id").notNull().references(() => usersTable.id),
  status: mysqlEnum("status", ["Hostel", "Left Hostel", "On the Way", "At Destination", "Reached", "Location Unavailable"]).notNull().default("Hostel"),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  batteryLevel: int("battery_level").default(100),
  isLowBatteryAlertSent: mysqlEnum("is_low_battery_alert_sent", ["true", "false"]).default("false"),
  notes: text("notes"),
  timestamp: timestamp("timestamp", { mode: "date" }).notNull().defaultNow(),
});

export const insertLocationLogSchema = createInsertSchema(locationLogsTable).omit({
  id: true,
  timestamp: true,
});

export type InsertLocationLog = z.infer<typeof insertLocationLogSchema>;
export type LocationLog = typeof locationLogsTable.$inferSelect;
