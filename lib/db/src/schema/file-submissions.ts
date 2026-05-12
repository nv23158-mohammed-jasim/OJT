import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { coursesTable } from "./courses";
import { submissionSlotsTable } from "./submission-slots";

export const submissionStatusEnum = pgEnum("submission_status", [
  "pending",
  "approved",
  "rejected",
  "revision_requested",
]);

export const fileSubmissionsTable = pgTable("file_submissions", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  slotId: integer("slot_id").references(() => submissionSlotsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  status: submissionStatusEnum("status").notNull().default("pending"),
  reviewerId: integer("reviewer_id").references(() => usersTable.id),
  reviewComment: text("review_comment"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFileSubmissionSchema = createInsertSchema(fileSubmissionsTable).omit({
  id: true,
  submittedAt: true,
  updatedAt: true,
});
export type InsertFileSubmission = z.infer<typeof insertFileSubmissionSchema>;
export type FileSubmission = typeof fileSubmissionsTable.$inferSelect;
