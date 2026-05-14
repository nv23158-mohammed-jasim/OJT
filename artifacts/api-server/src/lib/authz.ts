import { db, usersTable, coursesTable, enrollmentsTable, assignmentsTable, assignmentSubmissionsTable, discussionsTable, discussionRepliesTable } from "@workspace/db";
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

/** Returns access level: "admin" | "teacher" (owns course) | "student" (enrolled) | null */
export async function courseAccess(userId: number, courseId: number): Promise<"admin" | "teacher" | "student" | null> {
  const role = await getRole(userId);
  if (role === "admin") return "admin";
  if (role === "teacher") {
    const [c] = await db.select({ id: coursesTable.id }).from(coursesTable).where(and(eq(coursesTable.id, courseId), eq(coursesTable.teacherId, userId)));
    return c ? "teacher" : null;
  }
  if (role === "student") {
    const [e] = await db.select().from(enrollmentsTable).where(and(eq(enrollmentsTable.courseId, courseId), eq(enrollmentsTable.studentId, userId)));
    return e ? "student" : null;
  }
  return null;
}

export function isStaff(level: string | null): boolean {
  return level === "admin" || level === "teacher";
}

export async function getAssignmentCourseId(id: number): Promise<number | null> {
  const [a] = await db.select({ courseId: assignmentsTable.courseId }).from(assignmentsTable).where(eq(assignmentsTable.id, id));
  return a?.courseId ?? null;
}

export async function getDiscussionCourseId(id: number): Promise<{ courseId: number; authorId: number } | null> {
  const [d] = await db.select({ courseId: discussionsTable.courseId, authorId: discussionsTable.authorId }).from(discussionsTable).where(eq(discussionsTable.id, id));
  return d ? { courseId: d.courseId, authorId: d.authorId } : null;
}

export async function getReplyContext(id: number): Promise<{ courseId: number; authorId: number; isLocked: boolean } | null> {
  const [r] = await db
    .select({ authorId: discussionRepliesTable.authorId, courseId: discussionsTable.courseId, isLocked: discussionsTable.isLocked })
    .from(discussionRepliesTable)
    .leftJoin(discussionsTable, eq(discussionRepliesTable.discussionId, discussionsTable.id))
    .where(eq(discussionRepliesTable.id, id));
  return r ? { courseId: r.courseId!, authorId: r.authorId, isLocked: !!r.isLocked } : null;
}

export async function getSubmissionContext(id: number): Promise<{ courseId: number; studentId: number } | null> {
  const [s] = await db
    .select({ studentId: assignmentSubmissionsTable.studentId, courseId: assignmentsTable.courseId })
    .from(assignmentSubmissionsTable)
    .leftJoin(assignmentsTable, eq(assignmentSubmissionsTable.assignmentId, assignmentsTable.id))
    .where(eq(assignmentSubmissionsTable.id, id));
  return s ? { courseId: s.courseId!, studentId: s.studentId } : null;
}
