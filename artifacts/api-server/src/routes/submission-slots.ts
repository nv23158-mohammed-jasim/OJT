import { Router, type IRouter } from "express";
import {
  db,
  submissionSlotsTable,
  fileSubmissionsTable,
  usersTable,
  coursesTable,
} from "@workspace/db";
import { and, asc, desc, eq } from "drizzle-orm";
import { courseAccess, isStaff, requireAuth } from "../lib/authz.js";

const router: IRouter = Router();

const parseId = (raw: string | string[] | undefined) =>
  parseInt(Array.isArray(raw) ? raw[0]! : (raw ?? ""), 10);

const enrich = async (row: typeof submissionSlotsTable.$inferSelect) => {
  const counts = await db
    .select()
    .from(fileSubmissionsTable)
    .where(eq(fileSubmissionsTable.slotId, row.id));
  return {
    ...row,
    submissionCount: counts.length,
    pendingCount: counts.filter((s) => s.status === "pending").length,
    approvedCount: counts.filter((s) => s.status === "approved").length,
    rejectedCount: counts.filter((s) => s.status === "rejected").length,
  };
};

// List slots for a course
router.get("/courses/:courseId/submission-slots", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const courseId = parseId(req.params.courseId);
  const access = await courseAccess(userId, courseId);
  if (!access) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const rows = await db
    .select()
    .from(submissionSlotsTable)
    .where(eq(submissionSlotsTable.courseId, courseId))
    .orderBy(desc(submissionSlotsTable.createdAt));
  const enriched = await Promise.all(rows.map(enrich));
  res.json(enriched);
});

// Create a slot (teacher/admin)
router.post("/courses/:courseId/submission-slots", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const courseId = parseId(req.params.courseId);
  const access = await courseAccess(userId, courseId);
  if (!access || !isStaff(access)) {
    res.status(403).json({ error: "Only the course teacher or an admin can create slots" });
    return;
  }
  const { title, description, dueAt, allowResubmission } = req.body ?? {};
  if (!title || typeof title !== "string") {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  const [row] = await db
    .insert(submissionSlotsTable)
    .values({
      courseId,
      title,
      description: description ?? null,
      dueAt: dueAt ? new Date(dueAt) : null,
      allowResubmission: allowResubmission ?? true,
      createdBy: userId,
    })
    .returning();
  res.status(201).json(await enrich(row!));
});

// Get one slot
router.get("/submission-slots/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const id = parseId(req.params.id);
  const [row] = await db.select().from(submissionSlotsTable).where(eq(submissionSlotsTable.id, id));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const access = await courseAccess(userId, row.courseId);
  if (!access) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json(await enrich(row));
});

// Update slot (teacher/admin)
router.patch("/submission-slots/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const id = parseId(req.params.id);
  const [existing] = await db.select().from(submissionSlotsTable).where(eq(submissionSlotsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const access = await courseAccess(userId, existing.courseId);
  if (!access || !isStaff(access)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { title, description, dueAt, allowResubmission } = req.body ?? {};
  const [row] = await db
    .update(submissionSlotsTable)
    .set({
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(dueAt !== undefined ? { dueAt: dueAt ? new Date(dueAt) : null } : {}),
      ...(allowResubmission !== undefined ? { allowResubmission } : {}),
    })
    .where(eq(submissionSlotsTable.id, id))
    .returning();
  res.json(await enrich(row!));
});

// Delete slot (teacher/admin)
router.delete("/submission-slots/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const id = parseId(req.params.id);
  const [existing] = await db.select().from(submissionSlotsTable).where(eq(submissionSlotsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const access = await courseAccess(userId, existing.courseId);
  if (!access || !isStaff(access)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(submissionSlotsTable).where(eq(submissionSlotsTable.id, id));
  res.status(204).end();
});

// List submissions for a slot (any course member; students see only their own)
router.get("/submission-slots/:id/submissions", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const id = parseId(req.params.id);
  const [slot] = await db.select().from(submissionSlotsTable).where(eq(submissionSlotsTable.id, id));
  if (!slot) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const access = await courseAccess(userId, slot.courseId);
  if (!access) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const conditions: any[] = [eq(fileSubmissionsTable.slotId, id)];
  if (access === "student") conditions.push(eq(fileSubmissionsTable.studentId, userId));

  const rows = await db
    .select()
    .from(fileSubmissionsTable)
    .where(and(...conditions))
    .orderBy(asc(fileSubmissionsTable.submittedAt));

  const enriched = await Promise.all(
    rows.map(async (row) => {
      const [student] = await db
        .select({ name: usersTable.name, email: usersTable.email })
        .from(usersTable)
        .where(eq(usersTable.id, row.studentId));
      const [reviewer] = row.reviewerId
        ? await db
            .select({ name: usersTable.name })
            .from(usersTable)
            .where(eq(usersTable.id, row.reviewerId))
        : [null];
      const [course] = await db
        .select({ title: coursesTable.title, code: coursesTable.code })
        .from(coursesTable)
        .where(eq(coursesTable.id, row.courseId));
      return {
        ...row,
        studentName: student?.name ?? null,
        studentEmail: student?.email ?? null,
        reviewerName: reviewer?.name ?? null,
        courseTitle: course?.title ?? null,
        courseCode: course?.code ?? null,
        slotTitle: slot.title,
      };
    }),
  );
  res.json(enriched);
});

export default router;
