import { mysqlTable, varchar, int, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { journeysTable } from "./journeys";
import { geofencesTable } from "./geofences";

export const locationEventsTable = mysqlTable("location_events", {
  id: int("id").autoincrement().primaryKey(),
  journeyId: int("journey_id").notNull().references(() => journeysTable.id),
  geofenceId: int("geofence_id").references(() => geofencesTable.id),
  locationName: varchar("location_name", { length: 255 }).notNull(),
  latitude: varchar("latitude", { length: 50 }),
  longitude: varchar("longitude", { length: 50 }),
  eventType: mysqlEnum("event_type", [
    "JOURNEY_STARTED",
    "LOCATION_ARRIVED",
    "JOURNEY_COMPLETED",
    "JOURNEY_CANCELLED",
    "TRACKING_EXPIRED",
  ]).notNull(),
  triggeredAt: timestamp("triggered_at", { mode: "date" }).notNull().defaultNow(),
  notificationStatus: mysqlEnum("notification_status", ["pending", "sent", "failed", "skipped"]).notNull().default("sent"),
});

export const insertLocationEventSchema = createInsertSchema(locationEventsTable).omit({
  id: true,
  triggeredAt: true,
});
export type InsertLocationEvent = z.infer<typeof insertLocationEventSchema>;
export type LocationEvent = typeof locationEventsTable.$inferSelect;
