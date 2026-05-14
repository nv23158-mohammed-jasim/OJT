import { Router, type IRouter } from "express";
import {
  db,
  fileSubmissionsTable,
  usersTable,
  coursesTable,
  submissionSlotsTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { sendSubmissionDecisionEmail } from "../lib/email.js";
import { logger } from "../lib/logger.js";
import { courseAccess, isStaff } from "../lib/authz.js";

const router: IRouter = Router();

type Row = typeof fileSubmissionsTable.$inferSelect;

const getSessionUser = async (req: any) => {
  const userId = req.session?.userId;
  if (!userId) return null;
  const [user] = await db
    .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return user ?? null;
};

const enrich = async (row: Row) => {
  const [student] = await db.select({ name: usersTable.name, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, row.studentId));
  const [reviewer] = row.reviewerId
    ? await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, row.reviewerId))
    : [null];
  const [course] = await db.select({ title: coursesTable.title, code: coursesTable.code }).from(coursesTable).where(eq(coursesTable.id, row.courseId));
  const [slot] = row.slotId
    ? await db.select({ title: submissionSlotsTable.title }).from(submissionSlotsTable).where(eq(submissionSlotsTable.id, row.slotId))
    : [null];
  return {
    ...row,
    studentName: student?.name ?? null,
    studentEmail: student?.email ?? null,
    reviewerName: reviewer?.name ?? null,
    courseTitle: course?.title ?? null,
    courseCode: course?.code ?? null,
    slotTitle: slot?.title ?? null,
  };
};

router.get("/file-submissions", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const courseId = req.query.courseId ? parseInt(req.query.courseId as string, 10) : undefined;
  const slotId = req.query.slotId ? parseInt(req.query.slotId as string, 10) : undefined;
  const status = req.query.status as string | undefined;

  // Staff must scope by course they own (admins see all). Students always scoped to self.
  if (user.role === "teacher") {
    if (!courseId) { res.status(400).json({ error: "courseId is required for teachers" }); return; }
    const lvl = await courseAccess(user.id, courseId);
    if (lvl !== "teacher" && lvl !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  }

  const conditions: any[] = [];
  if (user.role === "student") conditions.push(eq(fileSubmissionsTable.studentId, user.id));
  if (courseId) conditions.push(eq(fileSubmissionsTable.courseId, courseId));
  if (slotId) conditions.push(eq(fileSubmissionsTable.slotId, slotId));
  if (status) conditions.push(eq(fileSubmissionsTable.status, status as any));

  const rows = conditions.length > 0
    ? await db.select().from(fileSubmissionsTable).where(and(...conditions)).orderBy(desc(fileSubmissionsTable.submittedAt))
    : await db.select().from(fileSubmissionsTable).orderBy(desc(fileSubmissionsTable.submittedAt));

  const enriched = await Promise.all(rows.map(enrich));
  res.json(enriched);
});

router.post("/file-submissions", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (user.role !== "student") { res.status(403).json({ error: "Students only" }); return; }

  const { courseId, slotId, title, description, fileUrl, fileName, fileType, fileSize } = req.body;
  if (!courseId || !slotId || !title || !fileUrl || !fileName) { res.status(400).json({ error: "Missing required fields" }); return; }

  // Student must be enrolled in the target course.
  const lvl = await courseAccess(user.id, courseId);
  if (lvl !== "student") { res.status(403).json({ error: "You are not enrolled in this course" }); return; }

  // Slot must belong to course; enforce resubmission policy.
  const [slot] = await db.select().from(submissionSlotsTable).where(eq(submissionSlotsTable.id, slotId));
  if (!slot) { res.status(404).json({ error: "Slot not found" }); return; }
  if (slot.courseId !== courseId) { res.status(400).json({ error: "Slot does not belong to course" }); return; }

  if (!slot.allowResubmission) {
    const [existing] = await db
      .select()
      .from(fileSubmissionsTable)
      .where(and(eq(fileSubmissionsTable.slotId, slotId), eq(fileSubmissionsTable.studentId, user.id)));
    if (existing) {
      res.status(400).json({ error: "Resubmissions are not allowed for this slot" });
      return;
    }
  }

  const [row] = await db.insert(fileSubmissionsTable).values({
    studentId: user.id,
    courseId,
    slotId,
    title,
    description,
    fileUrl,
    fileName,
    fileType,
    fileSize,
    status: "pending",
  }).returning();
  res.status(201).json(await enrich(row));
});

router.get("/file-submissions/:id", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db.select().from(fileSubmissionsTable).where(eq(fileSubmissionsTable.id, id));
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  if (user.role === "student") {
    if (row.studentId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  } else {
    // Staff must have access to the owning course (admin OK, teacher must own it).
    const lvl = await courseAccess(user.id, row.courseId);
    if (lvl !== "admin" && lvl !== "teacher") { res.status(403).json({ error: "Forbidden" }); return; }
  }
  res.json(await enrich(row));
});

router.patch("/file-submissions/:id", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(fileSubmissionsTable).where(eq(fileSubmissionsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  if (user.role === "student") {
    if (existing.studentId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }
    // Students may always edit while pending. Editing a reviewed (rejected/revision_requested)
    // submission is effectively a resubmission, so it requires the slot to allow it.
    if (existing.status === "approved") {
      res.status(400).json({ error: "Cannot edit an approved submission" }); return;
    }
    if (existing.status === "rejected" || existing.status === "revision_requested") {
      if (existing.slotId) {
        const [slot] = await db.select().from(submissionSlotsTable).where(eq(submissionSlotsTable.id, existing.slotId));
        if (!slot?.allowResubmission) {
          res.status(400).json({ error: "Resubmissions are not allowed for this slot" }); return;
        }
      }
    }
  } else {
    const lvl = await courseAccess(user.id, existing.courseId);
    if (lvl !== "admin" && lvl !== "teacher") { res.status(403).json({ error: "Forbidden" }); return; }
  }

  const { title, description, fileUrl, fileName, fileType, fileSize } = req.body;
  const [row] = await db.update(fileSubmissionsTable)
    .set({ title, description, fileUrl, fileName, fileType, fileSize, ...(user.role === "student" ? { status: "pending", reviewComment: null } : {}) })
    .where(eq(fileSubmissionsTable.id, id))
    .returning();
  res.json(await enrich(row));
});

router.post("/file-submissions/:id/review", async (req, res): Promise<void> => {
  const user = await getSessionUser(req);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (user.role === "student") { res.status(403).json({ error: "Reviewers only" }); return; }

  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [existing] = await db.select().from(fileSubmissionsTable).where(eq(fileSubmissionsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  // Reviewer must own the course (admins always OK).
  const lvl = await courseAccess(user.id, existing.courseId);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { status, reviewComment } = req.body;
  if (!["approved", "rejected", "revision_requested"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }

  const [row] = await db.update(fileSubmissionsTable)
    .set({ status, reviewComment, reviewerId: user.id, reviewedAt: new Date() })
    .where(eq(fileSubmissionsTable.id, id))
    .returning();

  // Notify the student on rejection / revision request.
  if (status === "rejected" || status === "revision_requested") {
    try {
      const enriched = await enrich(row);
      if (enriched.studentEmail) {
        await sendSubmissionDecisionEmail({
          to: enriched.studentEmail,
          studentName: enriched.studentName ?? "Student",
          courseTitle: enriched.courseTitle ?? "your course",
          slotTitle: enriched.slotTitle ?? enriched.title,
          decision: status,
          reviewerName: user.name,
          reviewComment: reviewComment ?? null,
        });
      }
    } catch (err) {
      logger.warn({ err }, "Failed to send submission decision email");
    }
  }

  res.json(await enrich(row));
});

export default router;
