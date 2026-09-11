import { mysqlTable, varchar, int, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { outpassesTable } from "./outpasses";
import { leavesTable } from "./leaves";

export const journeysTable = mysqlTable("journeys", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("student_id").notNull().references(() => usersTable.id),
  outpassId: int("outpass_id").references(() => outpassesTable.id),
  leaveId: int("leave_id").references(() => leavesTable.id),
  startLocation: varchar("start_location", { length: 255 }).notNull().default("Hostel Gate"),
  destination: varchar("destination", { length: 255 }).notNull(),
  status: mysqlEnum("status", [
    "pending",
    "active",
    "paused",
    "completed",
    "cancelled",
    "expired",
  ]).notNull().default("active"),
  trackingTokenHash: varchar("tracking_token_hash", { length: 255 }).notNull().unique(),
  startedAt: timestamp("started_at", { mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { mode: "date" }),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJourneySchema = createInsertSchema(journeysTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertJourney = z.infer<typeof insertJourneySchema>;
export type Journey = typeof journeysTable.$inferSelect;

export const journeyLocationsTable = mysqlTable("journey_locations", {
  id: int("id").autoincrement().primaryKey(),
  journeyId: int("journey_id").notNull().references(() => journeysTable.id),
  latitude: varchar("latitude", { length: 50 }).notNull(),
  longitude: varchar("longitude", { length: 50 }).notNull(),
  accuracy: int("accuracy").default(0),
  batteryLevel: int("battery_level").default(100),
  timestamp: timestamp("timestamp", { mode: "date" }).notNull().defaultNow(),
});

export const insertJourneyLocationSchema = createInsertSchema(journeyLocationsTable).omit({
  id: true,
  timestamp: true,
});
export type InsertJourneyLocation = z.infer<typeof insertJourneyLocationSchema>;
export type JourneyLocation = typeof journeyLocationsTable.$inferSelect;
