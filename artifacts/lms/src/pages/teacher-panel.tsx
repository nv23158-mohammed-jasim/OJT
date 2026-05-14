import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  useListCourses,
  useCreateCourse,
  useDeleteCourse,
  useListUsers,
  useListFileSubmissions,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Plus, BookOpen, GraduationCap, Check, ChevronRight,
  Trash2, ExternalLink, Clock, FileText,
} from "lucide-react";

export default function TeacherPanel() {
  const { user } = useAuth();
  const [showCreateCourse, setShowCreateCourse] = useState(false);

  const { data: allCourses, isLoading, refetch: refetchCourses } = useListCourses({ query: { enabled: !!user } as any });
  const { data: allSubmissions } = useListFileSubmissions(undefined, { query: { enabled: !!user } as any });

  if (!user || (user.role !== "teacher" && user.role !== "admin")) return null;

  const isAdmin = user.role === "admin";
  const myCourses = isAdmin
    ? (allCourses ?? [])
    : (allCourses?.filter((c: any) => c.teacherId === user.id) ?? []);

  const pendingReviews = (allSubmissions ?? []).filter((s: any) => {
    if (isAdmin) return s.status === "pending";
    return s.status === "pending" && myCourses.some((c: any) => c.id === s.courseId);
  });

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Manage all courses and review student submissions." : "Manage your courses and review student submissions."}
          </p>
        </div>
        <Button onClick={() => setShowCreateCourse(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New Course
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: isAdmin ? "All Courses" : "My Courses", value: myCourses.length, icon: BookOpen, color: "text-blue-500" },
          { label: "Active Courses", value: myCourses.filter((c: any) => c.isActive).length, icon: Check, color: "text-green-500" },
          { label: "Pending Reviews", value: pendingReviews.length, icon: Clock, color: pendingReviews.length > 0 ? "text-amber-500" : "text-muted-foreground" },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <div className="text-2xl font-bold leading-none">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Course list */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : myCourses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium">No courses yet</p>
            <p className="text-sm text-muted-foreground mt-1">Click "New Course" to create your first course.</p>
            <Button className="mt-4" onClick={() => setShowCreateCourse(true)}>Create Course</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {myCourses.map((course: any) => (
            <CourseRow
              key={course.id}
              course={course}
              pendingCount={(allSubmissions ?? []).filter((s: any) => s.courseId === course.id && s.status === "pending").length}
              onDeleted={refetchCourses}
            />
          ))}
        </div>
      )}

      <CreateCourseDialog
        open={showCreateCourse}
        onClose={() => setShowCreateCourse(false)}
        onCreated={() => { refetchCourses(); setShowCreateCourse(false); }}
        teacherId={user.id}
      />
    </div>
  );
}

function CourseRow({ course, pendingCount, onDeleted }: { course: any; pendingCount: number; onDeleted: () => void }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const deleteCourse = useDeleteCourse();

  const handleDelete = () => {
    if (!confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    deleteCourse.mutate({ id: course.id }, {
      onSuccess: () => { toast({ title: "Course deleted" }); onDeleted(); },
      onError: () => toast({ title: "Failed to delete course", variant: "destructive" }),
    });
  };

  return (
    <Card className="border border-border hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{course.title}</span>
              <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{course.code}</span>
              <Badge variant={course.isActive ? "default" : "secondary"} className="text-xs">
                {course.isActive ? "Active" : "Inactive"}
              </Badge>
              {pendingCount > 0 && (
                <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50 gap-1">
                  <Clock className="h-2.5 w-2.5" /> {pendingCount} pending
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {course.semester && <span>{course.semester} {course.academicYear}</span>}
              {course.teacherName && <span>· {course.teacherName}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setLocation(`/courses/${course.id}`)} className="gap-1">
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={deleteCourse.isPending}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Delete course"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateCourseDialog({ open, onClose, onCreated, teacherId }: {
  open: boolean; onClose: () => void; onCreated: () => void; teacherId: number;
}) {
  const { user } = useAuth();
  const { data: users } = useListUsers({ query: { enabled: open } as any });
  const teachers = (users ?? []).filter((u: any) => u.role === "teacher" || u.role === "admin");
  const createCourse = useCreateCourse();
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "", code: "", description: "", semester: "Semester 1",
    academicYear: new Date().getFullYear().toString(),
    teacherId: teacherId.toString(),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCourse.mutate({ data: { ...form, teacherId: parseInt(form.teacherId) } } as any, {
      onSuccess: () => { toast({ title: "Course created" }); onCreated(); },
      onError: (err: any) => toast({ title: "Failed to create course", description: err?.response?.data?.error ?? "Server error", variant: "destructive" }),
    });
  };

  const f = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Course</DialogTitle>
          <DialogDescription>Fill in the details to create a new course.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Course Title *</Label>
            <Input value={form.title} onChange={e => f("title", e.target.value)} placeholder="Introduction to Computer Science" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Course Code *</Label>
              <Input value={form.code} onChange={e => f("code", e.target.value)} placeholder="CS101" required />
            </div>
            {user?.role === "admin" && teachers.length > 0 && (
              <div className="space-y-1.5">
                <Label>Assigned Teacher</Label>
                <Select value={form.teacherId} onValueChange={v => f("teacherId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {teachers.map((t: any) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => f("description", e.target.value)} placeholder="Brief course overview…" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Semester</Label>
              <Select value={form.semester} onValueChange={v => f("semester", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Semester 1", "Semester 2"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Academic Year</Label>
              <Input value={form.academicYear} onChange={e => f("academicYear", e.target.value)} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createCourse.isPending || !form.title || !form.code}>
              {createCourse.isPending ? "Creating…" : "Create Course"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
