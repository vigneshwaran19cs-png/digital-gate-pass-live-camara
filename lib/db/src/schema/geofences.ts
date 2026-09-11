import { mysqlTable, varchar, int, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const geofencesTable = mysqlTable("geofences", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  latitude: varchar("latitude", { length: 50 }).notNull(),
  longitude: varchar("longitude", { length: 50 }).notNull(),
  radiusMeters: int("radius_meters").notNull().default(500),
  isEnabled: mysqlEnum("is_enabled", ["true", "false"]).notNull().default("true"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGeofenceSchema = createInsertSchema(geofencesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGeofence = z.infer<typeof insertGeofenceSchema>;
export type Geofence = typeof geofencesTable.$inferSelect;
