import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { coursesTable } from "./courses";
import { usersTable } from "./users";

export const submissionSlotsTable = pgTable("submission_slots", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  dueAt: timestamp("due_at", { withTimezone: true }),
  allowResubmission: boolean("allow_resubmission").notNull().default(true),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubmissionSlotSchema = createInsertSchema(submissionSlotsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSubmissionSlot = z.infer<typeof insertSubmissionSlotSchema>;
export type SubmissionSlot = typeof submissionSlotsTable.$inferSelect;
