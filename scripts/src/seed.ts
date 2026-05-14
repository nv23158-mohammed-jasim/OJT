import { db, usersTable, coursesTable } from "@workspace/db";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Seeding database...");

  const hash = (p: string) => bcrypt.hash(p, 10);

  const [admin] = await db.insert(usersTable).values({
    name: "Dr. Khalid Al-Rashidi",
    email: "admin@ncst.edu.bh",
    passwordHash: await hash("password123"),
    role: "admin",
    department: "Administration",
  }).onConflictDoNothing().returning();

  const [teacher1] = await db.insert(usersTable).values({
    name: "Dr. Aisha Mohammed",
    email: "teacher@example.com",
    passwordHash: await hash("password123"),
    role: "teacher",
    department: "Computer Science",
  }).onConflictDoNothing().returning();

  const [teacher2] = await db.insert(usersTable).values({
    name: "Prof. Yusuf Al-Mansoori",
    email: "teacher2@example.com",
    passwordHash: await hash("password123"),
    role: "teacher",
    department: "Mathematics",
  }).onConflictDoNothing().returning();

  await db.insert(usersTable).values({
    name: "Fatima Al-Zahra",
    email: "student@example.com",
    passwordHash: await hash("password123"),
    role: "student",
    studentId: "2021-CS-001",
    department: "Computer Science",
  }).onConflictDoNothing();

  await db.insert(usersTable).values({
    name: "Omar Al-Khalifa",
    email: "student2@example.com",
    passwordHash: await hash("password123"),
    role: "student",
    studentId: "2021-CS-002",
    department: "Computer Science",
  }).onConflictDoNothing();

  await db.insert(usersTable).values({
    name: "Mariam Al-Hassan",
    email: "student3@example.com",
    passwordHash: await hash("password123"),
    role: "student",
    studentId: "2021-CS-003",
    department: "Computer Science",
  }).onConflictDoNothing();

  const teacherId1 = teacher1?.id;
  const teacherId2 = teacher2?.id;

  if (!teacherId1 || !teacherId2) {
    console.log("Users already seeded, skipping courses.");
    return;
  }

  await db.insert(coursesTable).values([
    {
      title: "Introduction to Computer Science",
      code: "CS101",
      description: "Foundational course covering programming paradigms, algorithms, and computational thinking.",
      teacherId: teacherId1,
      semester: "Spring",
      academicYear: "2025-2026",
    },
    {
      title: "Data Structures and Algorithms",
      code: "CS201",
      description: "Advanced study of data structures, algorithm design, and complexity analysis.",
      teacherId: teacherId1,
      semester: "Spring",
      academicYear: "2025-2026",
    },
    {
      title: "Calculus I",
      code: "MATH101",
      description: "Differential and integral calculus with applications in science and engineering.",
      teacherId: teacherId2,
      semester: "Spring",
      academicYear: "2025-2026",
    },
  ]).onConflictDoNothing();

  console.log("Database seeded successfully!");
  console.log("Login credentials:");
  console.log("  Admin:   admin@ncst.edu.bh / password123");
  console.log("  Teacher: teacher@example.com / password123");
  console.log("  Student: student@example.com / password123");
}

seed().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
