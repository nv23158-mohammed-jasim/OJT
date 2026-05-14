import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, usersTable, coursesTable, fileSubmissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const toUser = (u: typeof usersTable.$inferSelect) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  studentId: u.studentId,
  department: u.department,
  avatarUrl: u.avatarUrl,
  createdAt: u.createdAt,
});

router.get("/users", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.name);
  res.json(users.map(toUser));
});

router.post("/users", async (req, res): Promise<void> => {
  const { name, email, password, role, studentId, department } = req.body;
  if (!name || !email || !password || !role) { res.status(400).json({ error: "Missing required fields" }); return; }
  const passwordHash = await bcrypt.hash(String(password).toLowerCase(), 10);
  const [user] = await db.insert(usersTable).values({ name, email: String(email).toLowerCase().trim(), passwordHash, role, studentId, department }).returning();
  res.status(201).json(toUser(user));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toUser(user));
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const callerId = (req.session as any)?.userId;
  if (!callerId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [caller] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, callerId));
  if (!caller) { res.status(401).json({ error: "Unauthorized" }); return; }
  const isAdmin = caller.role === "admin";
  if (id !== callerId && !isAdmin) { res.status(403).json({ error: "Forbidden" }); return; }
  const { name, email, role, studentId, department, avatarUrl } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) updates.name = name.trim();
  if (typeof department === "string") updates.department = department.trim() || null;
  if (typeof avatarUrl === "string") updates.avatarUrl = avatarUrl;
  if (isAdmin) {
    if (typeof email === "string" && email.trim()) updates.email = email.toLowerCase().trim();
    if (typeof role === "string") updates.role = role as any;
    if (typeof studentId === "string") updates.studentId = studentId.trim() || null;
  }
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No valid fields to update" }); return; }
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json(toUser(user));
});

router.delete("/users/:id", async (req, res): Promise<void> => {
  const callerId = (req.session as any)?.userId;
  if (!callerId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [caller] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, callerId));
  if (!caller || caller.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  if (id === callerId) { res.status(400).json({ error: "You cannot delete your own account" }); return; }
  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) { res.status(404).json({ error: "Not found" }); return; }
  try {
    await db.transaction(async (tx) => {
      await tx.delete(coursesTable).where(eq(coursesTable.teacherId, id));
      await tx.update(fileSubmissionsTable).set({ reviewerId: null }).where(eq(fileSubmissionsTable.reviewerId, id));
      await tx.delete(usersTable).where(eq(usersTable.id, id));
    });
    res.sendStatus(204);
  } catch (err: any) {
    req.log.error({ err }, "Failed to delete user");
    res.status(500).json({ error: err?.message ?? "Failed to delete user" });
  }
});

router.post("/users/bulk", async (req, res): Promise<void> => {
  const userId = (req.session as any)?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [caller] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  if (!caller || caller.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }
  const { users } = req.body as { users: Array<{ name: string; email: string; password: string; role: string; studentId?: string; department?: string }> };
  if (!Array.isArray(users) || users.length === 0) { res.status(400).json({ error: "users array required" }); return; }
  const results: Array<{ success: boolean; email: string; error?: string; user?: ReturnType<typeof toUser> }> = [];
  for (const u of users) {
    if (!u.name || !u.email || !u.password || !u.role) {
      results.push({ success: false, email: u.email ?? "?", error: "Missing required fields" }); continue;
    }
    try {
      const passwordHash = await bcrypt.hash(String(u.password).toLowerCase(), 10);
      const [created] = await db.insert(usersTable).values({
        name: u.name, email: u.email.toLowerCase(), passwordHash, role: u.role as any,
        studentId: u.studentId ?? null, department: u.department ?? null,
      }).returning();
      results.push({ success: true, email: u.email, user: toUser(created) });
    } catch (err: any) {
      const msg = err?.message?.includes("unique") ? "Email already exists" : (err?.message ?? "Unknown error");
      results.push({ success: false, email: u.email, error: msg });
    }
  }
  const succeeded = results.filter(r => r.success).length;
  res.status(200).json({ succeeded, failed: results.length - succeeded, results });
});

export default router;
