import { mysqlTable, text, int, varchar, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { journeysTable } from "./journeys";

export const whatsappLogsTable = mysqlTable("whatsapp_logs", {
  id: int("id").autoincrement().primaryKey(),
  journeyId: int("journey_id").references(() => journeysTable.id),
  recipientPhone: varchar("recipient_phone", { length: 50 }).notNull(),
  recipientRole: varchar("recipient_role", { length: 50 }).notNull(),
  messageType: varchar("message_type", { length: 50 }).notNull(),
  messageBody: text("message_body").notNull(),
  status: mysqlEnum("status", ["sent", "failed", "simulated"]).notNull().default("sent"),
  apiResponse: text("api_response"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at", { mode: "date" }).notNull().defaultNow(),
});

export const insertWhatsappLogSchema = createInsertSchema(whatsappLogsTable).omit({
  id: true,
  sentAt: true,
});
export type InsertWhatsappLog = z.infer<typeof insertWhatsappLogSchema>;
export type WhatsappLog = typeof whatsappLogsTable.$inferSelect;
