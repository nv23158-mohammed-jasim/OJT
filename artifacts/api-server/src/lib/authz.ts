import { db, usersTable, coursesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export function requireAuth(req: any, res: any): number | null {
  const uid = (req.session as any)?.userId;
  if (!uid) { res.status(401).json({ error: "Not authenticated" }); return null; }
  return uid;
}

export async function getRole(userId: number): Promise<string | null> {
  const [u] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  return u?.role ?? null;
}

/**
 * Returns access level for a course:
 * - "admin"   — user is an admin
 * - "teacher" — user is the teacher who owns the course
 * - "student" — user is a student (open access; no enrollment table)
 * - null      — unauthenticated or unknown role
 */
export async function courseAccess(userId: number, courseId: number): Promise<"admin" | "teacher" | "student" | null> {
  const role = await getRole(userId);
  if (role === "admin") return "admin";
  if (role === "teacher") {
    const [c] = await db
      .select({ id: coursesTable.id })
      .from(coursesTable)
      .where(and(eq(coursesTable.id, courseId), eq(coursesTable.teacherId, userId)));
    return c ? "teacher" : null;
  }
  if (role === "student") return "student";
  return null;
}

export function isStaff(level: string | null): boolean {
  return level === "admin" || level === "teacher";
}
