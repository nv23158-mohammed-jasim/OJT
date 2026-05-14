import React, { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetCourse,
  useListSubmissionSlots,
  useCreateSubmissionSlot,
  useDeleteSubmissionSlot,
  useListSlotSubmissions,
  useCreateFileSubmission,
  useUpdateFileSubmission,
  useReviewFileSubmission,
} from "@workspace/api-client-react";
import type { SubmissionSlot, FileSubmission, FileSubmissionReviewInputStatus } from "@workspace/api-client-react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText, ChevronLeft, Plus, Upload, Trash2, ExternalLink, Download, Clock,
  CheckCircle, XCircle, RefreshCw, Pencil, FolderOpen, Users, BookOpen,
} from "lucide-react";
import { format } from "date-fns";

function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function openFile(fileUrl: string, fileName: string, download = false) {
  if (fileUrl.startsWith("data:")) {
    const [header, data] = fileUrl.split(",");
    const mime = header?.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
    const binary = atob(data ?? "");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    if (download) a.download = fileName;
    else a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    const a = document.createElement("a");
    a.href = fileUrl;
    if (download) a.download = fileName;
    else a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
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

  const { data: course, isLoading: courseLoading } = useGetCourse(courseId, { query: { enabled: !!courseId } as any });
  const { data: slots, isLoading: slotsLoading, refetch: refetchSlots } = useListSubmissionSlots(courseId, { query: { enabled: !!courseId } as any });

  const isStaff = user?.role === "admin" || (user?.role === "teacher" && course?.teacherId === user.id);

  if (courseLoading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-1/2" /><Skeleton className="h-64 w-full" /></div>;
  }
  if (!course) {
    return <p className="text-muted-foreground">Course not found.</p>;
  }

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

      {/* Submission Slots Section — the only section in a course */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              Submission Slots
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isStaff
                ? "Create slots for students to upload files. You'll review each submission."
                : "Upload your files into the slots your teacher has set up."}
            </p>
          </div>
          {isStaff && <CreateSlotDialog courseId={courseId} onCreated={refetchSlots} />}
        </div>

        {slotsLoading ? (
          <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        ) : !slots?.length ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FolderOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="font-medium">No submission slots yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                {isStaff
                  ? "Click \"Add Slot\" above to create your first submission slot."
                  : "Your teacher hasn't created any slots yet. Check back soon."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {slots.map(slot => (
              <SlotCard
                key={slot.id}
                slot={slot}
                courseId={courseId}
                isStaff={!!isStaff}
                onChanged={refetchSlots}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── Slot Card ─────────────────────────────────────────────────────────── */
function SlotCard({ slot, courseId, isStaff, onChanged }: {
  slot: SubmissionSlot;
  courseId: number;
  isStaff: boolean;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const deleteSlot = useDeleteSubmissionSlot();

  const overdue = slot.dueAt && new Date(slot.dueAt) < new Date();

  const handleDelete = () => {
    if (!confirm(`Delete slot "${slot.title}"? All submissions to this slot will also be removed.`)) return;
    deleteSlot.mutate({ id: slot.id }, {
      onSuccess: () => { toast({ title: "Slot deleted" }); onChanged(); },
      onError: (err: any) => toast({ title: "Failed", description: err?.message ?? "Could not delete slot", variant: "destructive" }),
    });
  };

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              {slot.title}
            </CardTitle>
            {slot.description && (
              <CardDescription className="mt-1.5">{slot.description}</CardDescription>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
              {slot.dueAt && (
                <span className={`flex items-center gap-1 ${overdue ? "text-destructive font-medium" : ""}`}>
                  <Clock className="h-3 w-3" />
                  Due {format(new Date(slot.dueAt), "MMM d, yyyy 'at' h:mm a")}
                  {overdue && " (overdue)"}
                </span>
              )}
              <span>Resubmission {slot.allowResubmission ? "allowed" : "not allowed"}</span>
              {isStaff && (
                <>
                  <span>·</span>
                  <span>{slot.submissionCount ?? 0} submissions</span>
                  {(slot.pendingCount ?? 0) > 0 && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Clock className="h-3 w-3" />
                      {slot.pendingCount} pending
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Hide" : isStaff ? "View Submissions" : "Open"}
            </Button>
            {isStaff && (
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          <div className="border-t border-border -mx-6 px-6 pt-4">
            {isStaff
              ? <SlotReviewPanel slot={slot} />
              : <SlotStudentPanel slot={slot} courseId={courseId} userId={user!.id} />
            }
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ─── Student panel: upload form + your submissions ─────────────────────── */
function SlotStudentPanel({ slot, courseId, userId }: { slot: SubmissionSlot; courseId: number; userId: number }) {
  const { data: subs, refetch, isLoading } = useListSlotSubmissions(slot.id, { query: { enabled: true } as any });
  const create = useCreateFileSubmission();
  const update = useUpdateFileSubmission();
  const { toast } = useToast();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<{ url: string; name: string; type: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myLatest = subs?.[subs.length - 1] ?? null;
  // First submission is always allowed; further submissions only if the slot allows resubmission.
  const canSubmit = !myLatest || slot.allowResubmission;

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      setError(`File too large (${(f.size/1024/1024).toFixed(1)} MB). Max 8 MB.`);
      return;
    }
    setError(null);
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "other";
    const r = new FileReader();
    r.onload = () => setFile({ url: typeof r.result === "string" ? r.result : "", name: f.name, type: ext, size: f.size });
    r.readAsDataURL(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function reset() {
    setTitle(""); setDescription(""); setFile(null); setError(null); setEditingId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title) { setError("Please pick a file and give it a title."); return; }
    const payload = {
      courseId,
      slotId: slot.id,
      title,
      description,
      fileUrl: file.url,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    };
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
    setEditingId(sub.id);
    setTitle(sub.title);
    setDescription(sub.description ?? "");
    setFile({ url: sub.fileUrl, name: sub.fileName, type: sub.fileType ?? "", size: sub.fileSize ?? 0 });
  }

  return (
    <div className="space-y-5">
      {/* My submissions */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Your submissions</p>
        {isLoading ? (
          <Skeleton className="h-16 rounded-lg" />
        ) : !subs?.length ? (
          <p className="text-sm text-muted-foreground italic">You haven't submitted anything yet.</p>
        ) : (
          <div className="space-y-2">
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
                      {s.fileName} · {formatBytes(s.fileSize)} · Submitted {format(new Date(s.submittedAt), "MMM d, h:mm a")}
                    </p>
                    {s.reviewComment && (
                      <p className="text-xs mt-1 italic">"{s.reviewComment}"{s.reviewerName && ` — ${s.reviewerName}`}</p>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="ghost" size="sm" title="Open in new tab" onClick={() => openFile(s.fileUrl, s.fileName)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" title="Download" onClick={() => openFile(s.fileUrl, s.fileName, true)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  {(s.status === "pending" ||
                    ((s.status === "rejected" || s.status === "revision_requested") && slot.allowResubmission)) && (
                    <Button variant="ghost" size="sm" onClick={() => startEdit(s)} className="flex-shrink-0">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload form */}
      {canSubmit && (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-dashed border-border rounded-lg bg-muted/30">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {editingId ? "Replace your submission" : myLatest ? "Submit again" : "Upload your file"}
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
          {file && (
            <p className="text-xs text-muted-foreground">Ready: <span className="font-medium">{file.name}</span> · {formatBytes(file.size)}</p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            {editingId && <Button type="button" variant="ghost" size="sm" onClick={reset}>Cancel</Button>}
            <Button type="submit" size="sm" disabled={create.isPending || update.isPending || !file || !title}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {create.isPending || update.isPending ? "Submitting…" : editingId ? "Update Submission" : "Submit File"}
            </Button>
          </div>
        </form>
      )}
      {!canSubmit && (
        <p className="text-sm text-muted-foreground italic">
          Resubmissions are not allowed for this slot.
        </p>
      )}
    </div>
  );
}

/* ─── Reviewer panel: list + review action ───────────────────────────────── */
function SlotReviewPanel({ slot }: { slot: SubmissionSlot }) {
  const { data: subs, refetch, isLoading } = useListSlotSubmissions(slot.id, { query: { enabled: true } as any });
  const [reviewing, setReviewing] = useState<FileSubmission | null>(null);

  if (isLoading) return <Skeleton className="h-24 rounded-lg" />;
  if (!subs?.length) return <p className="text-sm text-muted-foreground italic">No submissions yet.</p>;

  return (
    <div className="space-y-2">
      {subs.map(s => {
        const cfg = statusConfig[s.status];
        return (
          <div key={s.id} className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.color}`}>
            <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{s.studentName ?? "Unknown student"}</span>
                <Badge variant={cfg.variant} className="gap-1 text-[10px]">{cfg.icon}{cfg.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                "{s.title}" · {s.fileName} · {formatBytes(s.fileSize)} · {format(new Date(s.submittedAt), "MMM d, h:mm a")}
              </p>
              {s.description && <p className="text-xs text-muted-foreground italic mt-1">"{s.description}"</p>}
              {s.reviewComment && (
                <p className="text-xs mt-1"><span className="font-medium">Your note:</span> {s.reviewComment}</p>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button variant="ghost" size="sm" title="Open in new tab" onClick={() => openFile(s.fileUrl, s.fileName)}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" title="Download" onClick={() => openFile(s.fileUrl, s.fileName, true)}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={() => setReviewing(s)} className="flex-shrink-0">
              {s.status === "pending" ? "Review" : "Re-review"}
            </Button>
          </div>
        );
      })}
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

/* ─── Create Slot Dialog ─────────────────────────────────────────────────── */
function CreateSlotDialog({ courseId, onCreated }: { courseId: number; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [allowResubmission, setAllowResubmission] = useState(true);
  const create = useCreateSubmissionSlot();
  const { toast } = useToast();

  function reset() { setTitle(""); setDescription(""); setDueAt(""); setAllowResubmission(true); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    create.mutate({
      courseId,
      data: {
        title,
        description: description || null,
        dueAt: dueAt ? new Date(dueAt).toISOString() : null,
        allowResubmission,
      } as any,
    }, {
      onSuccess: () => { setOpen(false); reset(); onCreated(); toast({ title: "Slot created" }); },
      onError: (err: any) => toast({ title: "Failed", description: err?.message ?? "Could not create slot", variant: "destructive" }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Slot</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Submission Slot</DialogTitle>
          <DialogDescription>
            Students will see this slot inside the course and upload their files into it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Week 1 OJT Report" />
          </div>
          <div className="space-y-1.5">
            <Label>Instructions</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="What should students submit?" />
          </div>
          <div className="space-y-1.5">
            <Label>Due date (optional)</Label>
            <Input type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm">Allow resubmission</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Students can replace their file if rejected.</p>
            </div>
            <Switch checked={allowResubmission} onCheckedChange={setAllowResubmission} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={create.isPending || !title}>
              {create.isPending ? "Creating…" : "Create Slot"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Review Dialog ──────────────────────────────────────────────────────── */
function ReviewDialog({ submission, onClose, onDone }: {
  submission: FileSubmission;
  onClose: () => void;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<string>(submission.status === "pending" ? "" : submission.status);
  const [comment, setComment] = useState(submission.reviewComment ?? "");
  const review = useReviewFileSubmission();
  const { toast } = useToast();

  function submit() {
    if (!status) return;
    review.mutate({ id: submission.id, data: { status: status as FileSubmissionReviewInputStatus, reviewComment: comment } }, {
      onSuccess: () => { toast({ title: `Submission ${status.replace("_", " ")}` }); onDone(); },
      onError: (err: any) => toast({ title: "Failed", description: err?.message ?? "Could not save review", variant: "destructive" }),
    });
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review submission</DialogTitle>
          <DialogDescription>{submission.studentName} · {submission.title}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "approved", label: "Approve", icon: <CheckCircle className="h-4 w-4" />, cls: "border-emerald-500 text-emerald-700 bg-emerald-50" },
              { value: "rejected", label: "Reject", icon: <XCircle className="h-4 w-4" />, cls: "border-red-500 text-red-700 bg-red-50" },
              { value: "revision_requested", label: "Revise", icon: <RefreshCw className="h-4 w-4" />, cls: "border-orange-500 text-orange-700 bg-orange-50" },
            ].map(o => (
              <button key={o.value} type="button" onClick={() => setStatus(o.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  status === o.value ? o.cls : "border-border text-muted-foreground hover:border-muted-foreground"
                }`}>
                {o.icon}
                {o.label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Comment {(status === "rejected" || status === "revision_requested") && <span className="text-destructive">*</span>}</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
              placeholder={status === "rejected" ? "Why was this rejected? The student will be emailed your feedback." : "Optional feedback…"} />
          </div>
          {(status === "rejected" || status === "revision_requested") && (
            <p className="text-xs text-muted-foreground">
              The student will be notified by email of your decision and any feedback.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit}
            disabled={!status || review.isPending || ((status === "rejected" || status === "revision_requested") && !comment.trim())}>
            {review.isPending ? "Saving…" : "Submit Review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
