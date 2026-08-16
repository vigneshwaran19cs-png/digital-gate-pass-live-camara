import { mysqlTable, text, int, varchar, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const hostelBlocksTable = mysqlTable("hostel_blocks", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  genderType: mysqlEnum("gender_type", ["boys", "girls", "coed"]).notNull().default("boys"),
  totalRooms: int("total_rooms").notNull().default(50),
  totalCapacity: int("total_capacity").notNull().default(200),
  wardenId: int("warden_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertHostelBlockSchema = createInsertSchema(hostelBlocksTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHostelBlock = z.infer<typeof insertHostelBlockSchema>;
export type HostelBlock = typeof hostelBlocksTable.$inferSelect;
