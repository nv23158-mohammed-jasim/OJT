import { Router, type IRouter } from "express";
import { db, coursesTable, usersTable } from "@workspace/db";
import { eq, count, inArray } from "drizzle-orm";
import { requireAuth, getRole, courseAccess, isStaff } from "../lib/authz.js";

const router: IRouter = Router();

router.get("/courses", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const role = await getRole(userId);

  let allowedIds: number[] | "all" = "all";
  if (role === "teacher") {
    const owned = await db.select({ id: coursesTable.id }).from(coursesTable).where(eq(coursesTable.teacherId, userId));
    allowedIds = owned.map(c => c.id);
  } else if (role !== "admin" && role !== "student") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  if (allowedIds !== "all" && allowedIds.length === 0) { res.json([]); return; }

  const baseQuery = db.select({
    id: coursesTable.id,
    title: coursesTable.title,
    code: coursesTable.code,
    description: coursesTable.description,
    teacherId: coursesTable.teacherId,
    teacherName: usersTable.name,
    semester: coursesTable.semester,
    academicYear: coursesTable.academicYear,
    isActive: coursesTable.isActive,
    createdAt: coursesTable.createdAt,
  }).from(coursesTable).leftJoin(usersTable, eq(coursesTable.teacherId, usersTable.id));

  const courses = allowedIds === "all"
    ? await baseQuery.orderBy(coursesTable.title)
    : await baseQuery.where(inArray(coursesTable.id, allowedIds)).orderBy(coursesTable.title);

  res.json(courses.map(c => ({ ...c, enrollmentCount: 0 })));
});

router.post("/courses", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const role = await getRole(userId);
  if (role !== "admin" && role !== "teacher") { res.status(403).json({ error: "Only teachers and admins can create courses" }); return; }
  const { title, code, description, teacherId, semester, academicYear } = req.body;
  if (!title || !code || !teacherId) { res.status(400).json({ error: "Missing required fields" }); return; }
  const finalTeacherId = role === "admin" ? teacherId : userId;
  const [course] = await db.insert(coursesTable).values({ title, code, description, teacherId: finalTeacherId, semester, academicYear }).returning();
  const [teacher] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, finalTeacherId));
  res.status(201).json({ ...course, teacherName: teacher?.name ?? null, enrollmentCount: 0 });
});

router.get("/courses/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const lvl = await courseAccess(userId, id);
  if (!lvl) { res.status(403).json({ error: "Forbidden" }); return; }
  const [course] = await db.select({
    id: coursesTable.id,
    title: coursesTable.title,
    code: coursesTable.code,
    description: coursesTable.description,
    teacherId: coursesTable.teacherId,
    teacherName: usersTable.name,
    semester: coursesTable.semester,
    academicYear: coursesTable.academicYear,
    isActive: coursesTable.isActive,
    createdAt: coursesTable.createdAt,
  }).from(coursesTable).leftJoin(usersTable, eq(coursesTable.teacherId, usersTable.id)).where(eq(coursesTable.id, id));
  if (!course) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...course, enrollmentCount: 0 });
});

router.patch("/courses/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const lvl = await courseAccess(userId, id);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Only the course teacher or an admin can edit this course" }); return; }
  const { title, code, description, teacherId, semester, academicYear, isActive } = req.body;
  const updates: Record<string, unknown> = { title, code, description, semester, academicYear, isActive };
  if (lvl === "admin" && teacherId !== undefined) updates.teacherId = teacherId;
  const [course] = await db.update(coursesTable).set(updates).where(eq(coursesTable.id, id)).returning();
  if (!course) { res.status(404).json({ error: "Not found" }); return; }
  const [teacher] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, course.teacherId));
  res.json({ ...course, teacherName: teacher?.name ?? null, enrollmentCount: 0 });
});

router.delete("/courses/:id", async (req, res): Promise<void> => {
  const userId = requireAuth(req, res); if (!userId) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const lvl = await courseAccess(userId, id);
  if (!isStaff(lvl)) { res.status(403).json({ error: "Only the course teacher or an admin can delete this course" }); return; }
  await db.delete(coursesTable).where(eq(coursesTable.id, id));
  res.sendStatus(204);
});

export default router;
