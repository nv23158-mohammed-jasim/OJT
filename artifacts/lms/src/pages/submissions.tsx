import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { useAuth } from "../context/AuthContext";
import {
  useListFileSubmissions,
  useReviewFileSubmission,
} from "@workspace/api-client-react";
import type { FileSubmission, FileSubmissionReviewInputStatus } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle, XCircle, Clock, RefreshCw, ExternalLink, Download } from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; color: string }> = {
  pending: { label: "Pending", variant: "secondary", icon: <Clock className="h-3 w-3" />, color: "text-amber-700 bg-amber-50 border-amber-200" },
  approved: { label: "Approved", variant: "default", icon: <CheckCircle className="h-3 w-3" />, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  rejected: { label: "Rejected", variant: "destructive", icon: <XCircle className="h-3 w-3" />, color: "text-red-700 bg-red-50 border-red-200" },
  revision_requested: { label: "Needs Revision", variant: "outline", icon: <RefreshCw className="h-3 w-3" />, color: "text-orange-700 bg-orange-50 border-orange-200" },
};

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

export default function Submissions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewing, setReviewing] = useState<FileSubmission | null>(null);

  const { data: submissions, isLoading, refetch } = useListFileSubmissions(
    statusFilter !== "all" ? { status: statusFilter as any } : undefined,
    { query: { enabled: !!user } as any }
  );

  if (!user) return null;
  const isReviewer = user.role === "teacher" || user.role === "admin";

  const filtered = submissions ?? [];
  const counts = useMemo(() => ({
    all: submissions?.length ?? 0,
    pending: submissions?.filter(s => s.status === "pending").length ?? 0,
    approved: submissions?.filter(s => s.status === "approved").length ?? 0,
    rejected: submissions?.filter(s => s.status === "rejected").length ?? 0,
    revision_requested: submissions?.filter(s => s.status === "revision_requested").length ?? 0,
  }), [submissions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isReviewer ? "Review Submissions" : "My Submissions"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isReviewer
            ? "Approve, reject, or request revision on student file submissions."
            : "Files you've submitted across all your courses. To submit a new file, open a course and choose a slot."}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "pending", "approved", "rejected", "revision_requested"] as const).map(s => (
          <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm"
            onClick={() => setStatusFilter(s)} className="capitalize gap-1.5">
            {s === "all" ? "All" : statusConfig[s].label}
            <span className="text-[10px] font-mono opacity-60">({counts[s]})</span>
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="font-medium">No submissions found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {!isReviewer
                ? "Open one of your courses to upload your first file."
                : "Nothing to review for the current filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(sub => {
            const cfg = statusConfig[sub.status];
            return (
              <Card key={sub.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{sub.title}</h3>
                          <Badge variant={cfg.variant} className="gap-1 flex-shrink-0">{cfg.icon}{cfg.label}</Badge>
                        </div>
                        {isReviewer && sub.studentName && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            By <span className="font-medium">{sub.studentName}</span>
                            {sub.studentEmail && <span className="text-xs ml-1">({sub.studentEmail})</span>}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                          {sub.courseTitle && (
                            <Link href={`/courses/${sub.courseId}`} className="hover:underline">
                              {sub.courseCode} — {sub.courseTitle}
                            </Link>
                          )}
                          {sub.slotTitle && <span>· Slot: <span className="font-medium">{sub.slotTitle}</span></span>}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {sub.fileName} · {formatBytes(sub.fileSize)} · Submitted {format(new Date(sub.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                        {sub.reviewComment && (
                          <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                            <span className="font-medium text-xs uppercase tracking-wide text-muted-foreground mr-1">Reviewer:</span>
                            {sub.reviewComment}
                            {sub.reviewerName && <span className="text-xs text-muted-foreground ml-1">— {sub.reviewerName}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="sm" className="gap-1" title="Open in new tab" onClick={() => openFile(sub.fileUrl, sub.fileName)}>
                        <ExternalLink className="h-3.5 w-3.5" /> Open
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-1" title="Download" onClick={() => openFile(sub.fileUrl, sub.fileName, true)}>
                        <Download className="h-3.5 w-3.5" /> Download
                      </Button>
                      {isReviewer && (
                        <Button size="sm" variant={sub.status === "pending" ? "default" : "outline"} onClick={() => setReviewing(sub)}>
                          {sub.status === "pending" ? "Review" : "Re-review"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {reviewing && (
        <ReviewDialog
          submission={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { setReviewing(null); refetch(); toast({ title: "Review saved" }); }}
        />
      )}
    </div>
  );
}

function ReviewDialog({ submission, onClose, onDone }: {
  submission: FileSubmission;
  onClose: () => void;
  onDone: () => void;
}) {
  const [status, setStatus] = useState<string>(submission.status === "pending" ? "" : submission.status);
  const [comment, setComment] = useState(submission.reviewComment ?? "");
  const review = useReviewFileSubmission();

  function submit() {
    if (!status) return;
    review.mutate(
      { id: submission.id, data: { status: status as FileSubmissionReviewInputStatus, reviewComment: comment } },
      { onSuccess: onDone }
    );
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Review submission</DialogTitle>
          <DialogDescription>
            {submission.studentName ?? "Student"} · {submission.title}
            {submission.slotTitle && <> · Slot: <em>{submission.slotTitle}</em></>}
          </DialogDescription>
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
                {o.icon}{o.label}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Comment {(status === "rejected" || status === "revision_requested") && <span className="text-destructive">*</span>}
            </Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={3}
              placeholder={status === "rejected" ? "Why was this rejected? The student will be emailed." : "Optional feedback…"} />
          </div>
          {(status === "rejected" || status === "revision_requested") && (
            <p className="text-xs text-muted-foreground">
              The student will receive an email with your feedback.
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
