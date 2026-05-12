import React from "react";
import { useAuth } from "../context/AuthContext";
import { useListCourses, useListFileSubmissions } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  BookOpen, Users, ChevronRight, GraduationCap, FileText, BarChart3, Shield, Clock, CheckCircle, XCircle,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div data-testid="dashboard-page" className="space-y-8">
      {/* Greeting */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-0.5">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize
          ${user.role === "admin" ? "bg-violet-100 text-violet-700" :
            user.role === "teacher" ? "bg-emerald-100 text-emerald-700" :
            "bg-blue-100 text-blue-700"}`}>
          {user.role}
        </div>
      </div>

      {user.role === "student" && <StudentDashboard />}
      {user.role === "teacher" && <TeacherDashboard userId={user.id} />}
      {user.role === "admin" && <AdminDashboard />}
    </div>
  );
}

/* ─── STUDENT ─────────────────────────────────────────────────────────────── */
function StudentDashboard() {
  const { data: courses, isLoading } = useListCourses({ query: { enabled: true } as any });
  const { data: submissions } = useListFileSubmissions(undefined, { query: { enabled: true } as any });

  const subStats = {
    pending: submissions?.filter(s => s.status === "pending").length ?? 0,
    approved: submissions?.filter(s => s.status === "approved").length ?? 0,
    rejected: submissions?.filter(s => s.status === "rejected" || s.status === "revision_requested").length ?? 0,
  };

  return (
    <div className="space-y-8">
      {/* Submission stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending Review", value: subStats.pending, icon: Clock, color: "text-amber-600 bg-amber-50" },
          { label: "Approved", value: subStats.approved, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
          { label: "Needs Action", value: subStats.rejected, icon: XCircle, color: "text-red-600 bg-red-50" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border border-slate-200">
              <CardContent className="p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "My Submissions", href: "/submissions", icon: FileText, desc: "Track file submission status" },
          { label: "Browse Courses", href: "/courses", icon: BookOpen, desc: "Open a course to submit files" },
          { label: "Settings", href: "/settings", icon: Shield, desc: "Update your profile" },
        ].map(l => {
          const Icon = l.icon;
          return (
            <Link key={l.href} href={l.href}>
              <Card className="border border-slate-200 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-none">{l.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{l.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Enrolled courses */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Enrolled Courses</h2>
          <Link href="/courses">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              View All <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : !courses?.length ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium text-sm">No courses yet</p>
              <p className="text-xs text-muted-foreground mt-1">You'll be enrolled when a lecturer sends you an invitation.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map(course => (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <Card className="border border-slate-200 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors">{course.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{course.teacherName}</p>
                      </div>
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex-shrink-0">{course.code}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{course.semester} {course.academicYear}</span>
                      <Badge variant={course.isActive ? "default" : "secondary"} className="text-[10px]">
                        {course.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── TEACHER ─────────────────────────────────────────────────────────────── */
function TeacherDashboard({ userId }: { userId: number }) {
  const { data: courses, isLoading } = useListCourses({ query: { enabled: true } as any });
  const { data: submissions } = useListFileSubmissions(undefined, { query: { enabled: true } as any });
  const myCourses = courses?.filter(c => c.teacherId === userId) ?? [];

  const totalStudents = myCourses.reduce((s, c) => s + (c.enrollmentCount ?? 0), 0);
  const myCourseIds = new Set(myCourses.map(c => c.id));
  const pendingCount = submissions?.filter(s => myCourseIds.has(s.courseId) && s.status === "pending").length ?? 0;

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "My Courses", value: myCourses.length, icon: BookOpen, color: "text-blue-600 bg-blue-50" },
          { label: "Total Students", value: totalStudents, icon: GraduationCap, color: "text-emerald-600 bg-emerald-50" },
          { label: "Active Courses", value: myCourses.filter(c => c.isActive).length, icon: BarChart3, color: "text-violet-600 bg-violet-50" },
          { label: "Pending Reviews", value: pendingCount, icon: Clock, color: "text-amber-600 bg-amber-50" },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border border-slate-200">
              <CardContent className="p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "My Panel", href: "/teacher", icon: GraduationCap, desc: "Manage courses & invitations" },
          { label: "Review Submissions", href: "/submissions", icon: FileText, desc: "Approve or reject student files" },
        ].map(l => {
          const Icon = l.icon;
          return (
            <Link key={l.href} href={l.href}>
              <Card className="border border-slate-200 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{l.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{l.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* My courses table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">My Courses</h2>
          <Link href="/teacher">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              Manage <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : myCourses.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">No courses yet</p>
              <Link href="/teacher">
                <Button size="sm" className="mt-3">Go to My Panel</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Course</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Term</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Students</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myCourses.map(course => (
                  <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium leading-none">{course.title}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{course.code}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {course.semester} {course.academicYear}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> {course.enrollmentCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={course.isActive ? "default" : "secondary"} className="text-xs">
                        {course.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/courses/${course.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs gap-1">
                          Open <ChevronRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ADMIN ───────────────────────────────────────────────────────────────── */
function AdminDashboard() {
  const { data: courses } = useListCourses({ query: { enabled: true } as any });
  const { data: submissions } = useListFileSubmissions(undefined, { query: { enabled: true } as any });

  const stats = [
    { label: "Total Courses", value: courses?.length ?? "—", icon: BookOpen, color: "text-blue-600 bg-blue-50" },
    { label: "Active Courses", value: courses?.filter(c => c.isActive).length ?? "—", icon: BarChart3, color: "text-emerald-600 bg-emerald-50" },
    { label: "Pending Submissions", value: submissions?.filter(s => s.status === "pending").length ?? 0, icon: Clock, color: "text-amber-600 bg-amber-50" },
    { label: "Admin Panel", value: "→", icon: Users, color: "text-violet-600 bg-violet-50", href: "/admin" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => {
          const Icon = s.icon;
          const card = (
            <Card className={`border border-slate-200 ${s.href ? "hover:border-primary/40 hover:shadow-sm cursor-pointer transition-all" : ""}`}>
              <CardContent className="p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          );
          return s.href
            ? <Link key={s.label} href={s.href}>{card}</Link>
            : <div key={s.label}>{card}</div>;
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Manage Users & Courses", href: "/admin", icon: Users, desc: "Full user and course administration" },
          { label: "Review Submissions", href: "/submissions", icon: FileText, desc: "Approve or reject any submission" },
          { label: "Browse Courses", href: "/courses", icon: BookOpen, desc: "View every course in the system" },
        ].map(l => {
          const Icon = l.icon;
          return (
            <Link key={l.href} href={l.href}>
              <Card className="border border-slate-200 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-none">{l.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{l.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
