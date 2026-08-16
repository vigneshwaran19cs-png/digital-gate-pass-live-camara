import { mysqlTable, int, varchar, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { departmentsTable } from "./departments";

export const classesTable = mysqlTable("classes", {
  id: int("id").autoincrement().primaryKey(),
  departmentId: int("department_id").notNull().references(() => departmentsTable.id),
  year: mysqlEnum("year", ["I", "II", "III", "IV"]).notNull(),
  section: varchar("section", { length: 10 }).notNull(),
  tutorId: int("tutor_id"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertClassSchema = createInsertSchema(classesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClass = z.infer<typeof insertClassSchema>;
export type Class = typeof classesTable.$inferSelect;
