import { mysqlTable, int, mysqlEnum, timestamp, text } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const journeySettingsTable = mysqlTable("journey_settings", {
  id: int("id").autoincrement().primaryKey(),
  notifyParent: mysqlEnum("notify_parent", ["true", "false"]).notNull().default("true"),
  notifyTutor: mysqlEnum("notify_tutor", ["true", "false"]).notNull().default("true"),
  notifyHod: mysqlEnum("notify_hod", ["true", "false"]).notNull().default("true"),
  notifyWarden: mysqlEnum("notify_warden", ["true", "false"]).notNull().default("true"),
  geofenceCooldownMinutes: int("geofence_cooldown_minutes").notNull().default(15),
  trackingExpiryHours: int("tracking_expiry_hours").notNull().default(24),
  whatsappEnabled: mysqlEnum("whatsapp_enabled", ["true", "false"]).notNull().default("true"),
  googleMapsApiKey: text("google_maps_api_key"),
  whatsappAccessToken: text("whatsapp_access_token"),
  whatsappPhoneNumberId: text("whatsapp_phone_number_id"),
  whatsappBusinessAccountId: text("whatsapp_business_account_id"),
  gpsSignalTimeoutMinutes: int("gps_signal_timeout_minutes").notNull().default(5),
  redZoneAlertEnabled: mysqlEnum("red_zone_alert_enabled", ["true", "false"]).notNull().default("true"),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJourneySettingsSchema = createInsertSchema(journeySettingsTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertJourneySettings = z.infer<typeof insertJourneySettingsSchema>;
export type JourneySettings = typeof journeySettingsTable.$inferSelect;
