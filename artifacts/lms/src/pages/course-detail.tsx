import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetCourse,
  useListFileSubmissions,
  useCreateFileSubmission,
  useUpdateFileSubmission,
  useReviewFileSubmission,
} from "@workspace/api-client-react";
import type { FileSubmission, FileSubmissionReviewInputStatus } from "@workspace/api-client-react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, ChevronLeft, Upload, ExternalLink, Download,
  Clock, CheckCircle, XCircle, RefreshCw, Pencil, Users,
} from "lucide-react";
import { format } from "date-fns";

function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function openFile(fileUrl: string, fileName: string, download = false) {
  const a = document.createElement("a");
  if (fileUrl.startsWith("data:")) {
    const [header, data] = fileUrl.split(",");
    const mime = header?.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
    const binary = atob(data ?? "");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    a.href = URL.createObjectURL(blob);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } else {
    a.href = fileUrl;
  }
  if (download) a.download = fileName; else a.target = "_blank";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; color: string }> = {
  pending: { label: "Pending Review", variant: "secondary", icon: <Clock className="h-3 w-3" />, color: "text-amber-600 bg-amber-50 border-amber-200" },
  approved: { label: "Approved", variant: "default", icon: <CheckCircle className="h-3 w-3" />, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  rejected: { label: "Rejected", variant: "destructive", icon: <XCircle className="h-3 w-3" />, color: "text-red-700 bg-red-50 border-red-200" },
  revision_requested: { label: "Needs Revision", variant: "outline", icon: <RefreshCw className="h-3 w-3" />, color: "text-orange-700 bg-orange-50 border-orange-200" },
};

export default function CourseDetail() {
  const [, params] = useRoute("/courses/:id");
  const courseId = params?.id ? parseInt(params.id, 10) : 0;
  const { user } = useAuth();

  const { data: course, isLoading } = useGetCourse(courseId, { query: { enabled: !!courseId } as any });
  const isStaff = user?.role === "admin" || (user?.role === "teacher" && course?.teacherId === user?.id);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12 w-1/2" /><Skeleton className="h-64 w-full" /></div>;
  if (!course) return <p className="text-muted-foreground">Course not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/courses">
          <Button variant="ghost" size="sm" className="gap-1 mb-3 -ml-2">
            <ChevronLeft className="h-4 w-4" /> Back to courses
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
              <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{course.code}</span>
              <Badge variant={course.isActive ? "default" : "secondary"}>{course.isActive ? "Active" : "Inactive"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {course.teacherName ? `Taught by ${course.teacherName}` : null}
              {course.semester ? ` · ${course.semester} ${course.academicYear ?? ""}` : null}
            </p>
            {course.description && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{course.description}</p>}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{course.enrollmentCount ?? 0} students</span>
          </div>
        </div>
      </div>

      <div className="border-t border-border" />

      {isStaff
        ? <StaffPanel courseId={courseId} />
        : <StudentPanel courseId={courseId} />
      }
    </div>
  );
}

/* ─── Student panel ──────────────────────────────────────────────────────── */
function StudentPanel({ courseId }: { courseId: number }) {
  const { data: subs, refetch, isLoading } = useListFileSubmissions(
    { courseId } as any,
    { query: { enabled: true } as any }
  );
  const create = useCreateFileSubmission();
  const update = useUpdateFileSubmission();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<{ url: string; name: string; type: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) { setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 8 MB.`); return; }
    setError(null);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "other";
    const r = new FileReader();
    r.onload = () => setFile({ url: typeof r.result === "string" ? r.result : "", name: f.name, type: ext, size: f.size });
    r.readAsDataURL(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function reset() { setTitle(""); setDescription(""); setFile(null); setError(null); setEditingId(null); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) { setError("Please pick a file and give it a title."); return; }
    const payload = { courseId, title, description, fileUrl: file.url, fileName: file.name, fileType: file.type, fileSize: file.size };
    if (editingId) {
      update.mutate({ id: editingId, data: payload } as any, {
        onSuccess: () => { reset(); refetch(); toast({ title: "Submission updated" }); },
        onError: (err: any) => setError(err?.response?.data?.error ?? "Failed to update."),
      });
    } else {
      create.mutate({ data: payload } as any, {
        onSuccess: () => { reset(); refetch(); toast({ title: "File submitted", description: "Your teacher will review it shortly." }); },
        onError: (err: any) => setError(err?.response?.data?.error ?? "Failed to submit."),
      });
    }
  }

  function startEdit(sub: FileSubmission) {
    setEditingId(sub.id); setTitle(sub.title);
    setDescription(sub.description ?? "");
    setFile({ url: sub.fileUrl, name: sub.fileName, type: sub.fileType ?? "", size: sub.fileSize ?? 0 });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Your Submissions</h2>
        <p className="text-sm text-muted-foreground mb-4">Upload your files for this course. Your teacher will review each one.</p>

        {isLoading ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : !subs?.length ? (
          <p className="text-sm text-muted-foreground italic mb-4">You haven't submitted anything yet.</p>
        ) : (
          <div className="space-y-2 mb-4">
            {subs.map(s => {
              const cfg = statusConfig[s.status];
              return (
                <div key={s.id} className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.color}`}>
                  <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{s.title}</span>
                      <Badge variant={cfg.variant} className="gap-1 text-[10px]">{cfg.icon}{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {s.fileName} · {formatBytes(s.fileSize)} · {format(new Date(s.submittedAt), "MMM d, h:mm a")}
                    </p>
                    {s.reviewComment && <p className="text-xs mt-1 italic">"{s.reviewComment}"{s.reviewerName && ` — ${s.reviewerName}`}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => openFile(s.fileUrl, s.fileName)}><ExternalLink className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => openFile(s.fileUrl, s.fileName, true)}><Download className="h-3.5 w-3.5" /></Button>
                    {s.status !== "approved" && <Button variant="ghost" size="sm" onClick={() => startEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-dashed border-border rounded-lg bg-muted/30">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {editingId ? "Replace your submission" : "Upload a file"}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What is this submission?" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">File (max 8 MB)</Label>
              <Input type="file" onChange={onFileChange} required={!editingId && !file} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Anything your teacher should know" />
          </div>
          {file && <p className="text-xs text-muted-foreground">Ready: <span className="font-medium">{file.name}</span> · {formatBytes(file.size)}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            {editingId && <Button type="button" variant="ghost" size="sm" onClick={reset}>Cancel</Button>}
            <Button type="submit" size="sm" disabled={create.isPending || update.isPending || !file || !title}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {create.isPending || update.isPending ? "Submitting…" : editingId ? "Update" : "Submit File"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Staff review panel ─────────────────────────────────────────────────── */
function StaffPanel({ courseId }: { courseId: number }) {
  const { data: subs, refetch, isLoading } = useListFileSubmissions(
    { courseId } as any,
    { query: { enabled: true } as any }
  );
  const [reviewing, setReviewing] = useState<FileSubmission | null>(null);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">Student Submissions</h2>
        <p className="text-sm text-muted-foreground">Review and approve or reject files submitted by students.</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-24 rounded-lg" />
      ) : !subs?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="font-medium">No submissions yet</p>
            <p className="text-sm text-muted-foreground mt-1">Students haven't submitted any files for this course.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {subs.map(s => {
            const cfg = statusConfig[s.status];
            return (
              <div key={s.id} className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.color}`}>
                <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{s.studentName ?? "Unknown"}</span>
                    <Badge variant={cfg.variant} className="gap-1 text-[10px]">{cfg.icon}{cfg.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    "{s.title}" · {s.fileName} · {formatBytes(s.fileSize)} · {format(new Date(s.submittedAt), "MMM d, h:mm a")}
                  </p>
                  {s.description && <p className="text-xs text-muted-foreground italic mt-1">"{s.description}"</p>}
                  {s.reviewComment && <p className="text-xs mt-1"><span className="font-medium">Note:</span> {s.reviewComment}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => openFile(s.fileUrl, s.fileName)}><ExternalLink className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => openFile(s.fileUrl, s.fileName, true)}><Download className="h-3.5 w-3.5" /></Button>
                </div>
                <Button size="sm" variant="outline" onClick={() => setReviewing(s)} className="flex-shrink-0">
                  {s.status === "pending" ? "Review" : "Re-review"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
      {reviewing && (
        <ReviewDialog
          submission={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); refetch(); }}
        />
      )}
    </div>
  );
}

/* ─── Review Dialog ──────────────────────────────────────────────────────── */
function ReviewDialog({ submission, onClose, onDone }: { submission: FileSubmission; onClose: () => void; onDone: () => void }) {
  const [status, setStatus] = useState<string>(submission.status === "pending" ? "" : submission.status);
  const [comment, setComment] = useState(submission.reviewComment ?? "");
  const review = useReviewFileSubmission();
  const { toast } = useToast();

  function submit() {
    if (!status) return;
    review.mutate({ id: submission.id, data: { status: status as FileSubmissionReviewInputStatus, reviewComment: comment } }, {
      onSuccess: () => { toast({ title: `Submission ${status.replace("_", " ")}` }); onDone(); },
      onError: (err: any) => toast({ title: "Failed", description: err?.message, variant: "destructive" }),
    });
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review Submission</DialogTitle>
          <DialogDescription>"{submission.title}" by {submission.studentName ?? "student"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex gap-2 flex-wrap">
            {(["approved", "rejected", "revision_requested"] as const).map(s => (
              <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)}
                className={status === s && s === "approved" ? "bg-emerald-600 hover:bg-emerald-700" : status === s && s === "rejected" ? "bg-destructive hover:bg-destructive/90" : ""}>
                {s === "approved" ? "Approve" : s === "rejected" ? "Reject" : "Request Revision"}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Comment (optional)</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Leave feedback for the student…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!status || review.isPending}>
            {review.isPending ? "Saving…" : "Save Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
