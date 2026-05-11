import React, { useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { useCreateQuiz, useCreateQuestion } from "@workspace/api-client-react";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical, Sparkles, Loader2, Wand2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type QuestionType = "multiple_choice" | "true_false" | "short_answer" | "essay" | "file_upload";

interface QuestionDraft {
  id: string;
  questionText: string;
  questionType: QuestionType;
  points: number;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

function QuestionCard({ q, index, onChange, onDelete }: {
  q: QuestionDraft;
  index: number;
  onChange: (q: QuestionDraft) => void;
  onDelete: () => void;
}) {
  const update = (patch: Partial<QuestionDraft>) => onChange({ ...q, ...patch });

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium text-muted-foreground">Question {index + 1}</CardTitle>
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label>Question Text</Label>
            <Textarea
              value={q.questionText}
              onChange={e => update({ questionText: e.target.value })}
              placeholder="Enter your question..."
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={q.questionType} onValueChange={v => update({ questionType: v as QuestionType, correctAnswer: "", options: ["", "", "", ""] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                <SelectItem value="true_false">True / False</SelectItem>
                <SelectItem value="short_answer">Short Answer</SelectItem>
                <SelectItem value="essay">Essay</SelectItem>
                <SelectItem value="file_upload">File Upload</SelectItem>
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <Label>Points</Label>
              <Input type="number" min="1" value={q.points} onChange={e => update({ points: parseInt(e.target.value) || 1 })} className="h-8" />
            </div>
          </div>
        </div>

        {q.questionType === "multiple_choice" && (
          <div className="space-y-2">
            <Label>Options <span className="text-xs text-muted-foreground">(select correct answer)</span></Label>
            {q.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correctAnswer === opt && opt !== ""}
                  onChange={() => update({ correctAnswer: opt })}
                  className="h-4 w-4 accent-primary"
                />
                <Input
                  value={opt}
                  onChange={e => {
                    const newOpts = [...q.options];
                    newOpts[i] = e.target.value;
                    update({ options: newOpts, correctAnswer: q.correctAnswer === q.options[i] ? e.target.value : q.correctAnswer });
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="h-8"
                />
                {q.options.length > 2 && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                    onClick={() => {
                      const newOpts = q.options.filter((_, idx) => idx !== i);
                      update({ options: newOpts, correctAnswer: q.correctAnswer === q.options[i] ? "" : q.correctAnswer });
                    }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            {q.options.length < 6 && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => update({ options: [...q.options, ""] })}>
                <Plus className="h-3 w-3 mr-1" />Add Option
              </Button>
            )}
          </div>
        )}

        {q.questionType === "true_false" && (
          <div className="space-y-2">
            <Label>Correct Answer</Label>
            <div className="flex gap-4">
              {["True", "False"].map(v => (
                <label key={v} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name={`tf-${q.id}`} checked={q.correctAnswer === v} onChange={() => update({ correctAnswer: v })} className="h-4 w-4 accent-primary" />
                  <span className="text-sm">{v}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {(q.questionType === "short_answer" || q.questionType === "essay") && (
          <div className="px-3 py-2 bg-muted/50 rounded text-xs text-muted-foreground">
            Students will type their response. Manual grading required.
          </div>
        )}

        {q.questionType === "file_upload" && (
          <div className="px-3 py-2 bg-muted/50 rounded text-xs text-muted-foreground">
            Students will describe their file upload in text. Manual grading required.
          </div>
        )}

        <div className="space-y-2">
          <Label>Explanation <span className="text-xs text-muted-foreground">(shown after grading)</span></Label>
          <Input value={q.explanation} onChange={e => update({ explanation: e.target.value })} placeholder="Optional explanation..." className="h-8" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function QuizBuilder() {
  const [, params] = useRoute("/courses/:courseId/quiz-builder");
  const courseId = params?.courseId ? parseInt(params.courseId) : 0;
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [quizType, setQuizType] = useState<"quiz" | "exam">("quiz");
  const [durationMinutes, setDurationMinutes] = useState<number | undefined>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [isLockdown, setIsLockdown] = useState(false);
  const [lockdownCamera, setLockdownCamera] = useState(false);
  const [lockdownMic, setLockdownMic] = useState(false);

  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [aiOpen, setAiOpen] = useState(false);

  const createQuiz = useCreateQuiz();
  const createQuestion = useCreateQuestion();

  const handleAIQuestions = (generated: QuestionDraft[]) => {
    setQuestions(qs => [...qs, ...generated]);
    setAiOpen(false);
  };

  const addQuestion = () => {
    setQuestions(qs => [...qs, {
      id: Math.random().toString(36).slice(2),
      questionText: "",
      questionType: "multiple_choice",
      points: 1,
      options: ["", "", "", ""],
      correctAnswer: "",
      explanation: "",
    }]);
  };

  const saveQuiz = async (publish: boolean) => {
    if (!title.trim()) return;
    const quiz = await new Promise<any>((resolve, reject) => {
      createQuiz.mutate({
        data: {
          courseId,
          title,
          description,
          quizType,
          isLockdown: quizType === "exam" ? isLockdown : false,
          lockdownCamera: isLockdown ? lockdownCamera : false,
          lockdownMic: isLockdown ? lockdownMic : false,
          durationMinutes: durationMinutes || undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          maxAttempts,
          isPublished: publish,
        }
      } as any, { onSuccess: resolve, onError: reject }
      );
    });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await new Promise<void>((resolve, reject) => {
        createQuestion.mutate({
          quizId: quiz.id,
          data: {
            quizId: quiz.id,
            questionText: q.questionText,
            questionType: q.questionType,
            points: q.points,
            position: i,
            options: q.questionType === "multiple_choice" ? JSON.stringify(q.options.filter(o => o.trim())) : undefined,
            correctAnswer: q.correctAnswer || undefined,
            explanation: q.explanation || undefined,
          }
        } as any, { onSuccess: () => resolve(), onError: reject });
      });
    }

    navigate(`/courses/${courseId}`);
  };

  return (
    <div data-testid="quiz-builder-page" className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/courses" className="hover:text-foreground">Courses</Link>
        <span>/</span>
        <Link href={`/courses/${courseId}`} className="hover:text-foreground">Course</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Quiz Builder</span>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quiz Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">Build manually or let AI draft your questions, then refine.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setAiOpen(true)}
            className="border-primary/30 text-primary hover:bg-primary/5 gap-1.5"
            data-testid="ai-generate-btn"
          >
            <Sparkles className="h-4 w-4" />
            Generate with AI
          </Button>
          <Button variant="outline" onClick={() => saveQuiz(false)} disabled={createQuiz.isPending || !title.trim()}>Save Draft</Button>
          <Button onClick={() => saveQuiz(true)} disabled={createQuiz.isPending || !title.trim()} className="gradient-primary text-white">
            {createQuiz.isPending ? "Saving..." : "Publish"}
          </Button>
        </div>
      </div>

      <AIGenerateDialog open={aiOpen} onOpenChange={setAiOpen} onAccept={handleAIQuestions} courseTitle={title} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings panel */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Quiz Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Title <span className="text-destructive">*</span></Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Midterm Exam" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional instructions..." />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={quizType} onValueChange={v => { setQuizType(v as "quiz" | "exam"); if (v === "quiz") setIsLockdown(false); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="exam">Exam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input type="number" min="1" value={durationMinutes || ""} onChange={e => setDurationMinutes(parseInt(e.target.value) || undefined)} placeholder="e.g. 60" />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Max Attempts</Label>
                <Input type="number" min="1" value={maxAttempts} onChange={e => setMaxAttempts(parseInt(e.target.value) || 1)} />
              </div>
              {quizType === "exam" && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <Label className="text-sm font-semibold">Lockdown Settings</Label>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-normal">Lockdown Mode</Label>
                    <Switch checked={isLockdown} onCheckedChange={setIsLockdown} />
                  </div>
                  {isLockdown && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-normal">Camera Monitoring</Label>
                        <Switch checked={lockdownCamera} onCheckedChange={setLockdownCamera} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-normal">Microphone Monitoring</Label>
                        <Switch checked={lockdownMic} onCheckedChange={setLockdownMic} />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{questions.length} questions</span>
                  <span>&bull;</span>
                  <span>{questions.reduce((s, q) => s + q.points, 0)} points total</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Questions panel */}
        <div className="lg:col-span-2 space-y-4">
          {questions.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center text-muted-foreground">
                <BookOpenIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No questions yet</p>
                <p className="text-sm mt-1 mb-4">Add one manually, or let our AI assistant draft a full set for you.</p>
                <Button
                  size="sm"
                  onClick={() => setAiOpen(true)}
                  className="gradient-primary text-white gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate with AI
                </Button>
              </CardContent>
            </Card>
          )}
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              q={q}
              index={i}
              onChange={updated => setQuestions(qs => qs.map(x => x.id === q.id ? updated : x))}
              onDelete={() => setQuestions(qs => qs.filter(x => x.id !== q.id))}
            />
          ))}
          <Button variant="outline" className="w-full" onClick={addQuestion} data-testid="add-question-btn">
            <Plus className="h-4 w-4 mr-2" />Add Question
          </Button>
        </div>
      </div>
    </div>
  );
}

function BookOpenIcon({ className }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
}

/* ─── AI Generation Dialog ─────────────────────────────────────────────────── */

const QUESTION_TYPE_OPTIONS = [
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short Answer" },
  { value: "essay", label: "Essay" },
] as const;

function AIGenerateDialog({
  open, onOpenChange, onAccept, courseTitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAccept: (qs: QuestionDraft[]) => void;
  courseTitle: string;
}) {
  const { toast } = useToast();
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["multiple_choice", "true_false"]);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<QuestionDraft[] | null>(null);

  const toggleType = (t: string) => {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const reset = () => {
    setTopic(""); setCount(5); setDifficulty("medium");
    setSelectedTypes(["multiple_choice", "true_false"]); setInstructions("");
    setPreview(null); setLoading(false);
  };

  const generate = async () => {
    if (!topic.trim()) {
      toast({ title: "Please enter a topic", variant: "destructive" });
      return;
    }
    if (selectedTypes.length === 0) {
      toast({ title: "Please select at least one question type", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate-questions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          count,
          difficulty,
          questionTypes: selectedTypes,
          courseContext: courseTitle ? `Quiz titled "${courseTitle}"` : "",
          instructions: instructions.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "AI generation failed", variant: "destructive" });
        return;
      }
      const drafts: QuestionDraft[] = (data.questions ?? []).map((q: any) => ({
        id: Math.random().toString(36).slice(2),
        questionText: q.questionText ?? "",
        questionType: q.questionType ?? "multiple_choice",
        points: q.points ?? 1,
        options: Array.isArray(q.options) && q.options.length ? q.options : ["", "", "", ""],
        correctAnswer: q.correctAnswer ?? "",
        explanation: q.explanation ?? "",
      }));
      setPreview(drafts);
    } catch (e) {
      toast({ title: "Network error contacting the AI assistant", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const accept = () => {
    if (!preview) return;
    onAccept(preview);
    toast({ title: `Added ${preview.length} AI-generated questions` });
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary text-white flex items-center justify-center">
              <Wand2 className="h-4 w-4" />
            </div>
            AI Question Generator
          </DialogTitle>
          <DialogDescription>
            Describe what the quiz should cover and our AI assistant will draft questions you can review, edit, and publish.
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Topic <span className="text-destructive">*</span></Label>
              <Textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. The structure and bonding of organic molecules covered in Chapter 3"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Number of questions</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={count}
                  onChange={e => setCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                />
              </div>
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select value={difficulty} onValueChange={(v: any) => setDifficulty(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy — Recall</SelectItem>
                    <SelectItem value="medium">Medium — Application</SelectItem>
                    <SelectItem value="hard">Hard — Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Question types <span className="text-xs text-muted-foreground">(pick at least one)</span></Label>
              <div className="grid grid-cols-2 gap-2">
                {QUESTION_TYPE_OPTIONS.map(opt => {
                  const active = selectedTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleType(opt.value)}
                      className={`text-left text-sm px-3 py-2 rounded-lg border transition-all ${
                        active
                          ? "border-primary bg-primary/5 text-primary font-semibold"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional instructions <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                placeholder="e.g. Focus on real-world examples, avoid trick questions, include one question on industrial applications"
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={generate} disabled={loading || !topic.trim()} className="gradient-primary text-white gap-1.5">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4" /> Generate</>}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Preview · {preview.length} questions drafted</p>
              <Button variant="ghost" size="sm" onClick={() => setPreview(null)} className="text-xs">
                ← Adjust prompt
              </Button>
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {preview.map((q, i) => (
                <div key={q.id} className="border border-border rounded-lg p-3 bg-muted/30">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="text-[10px] mt-0.5 capitalize">
                      {q.questionType.replace(/_/g, " ")}
                    </Badge>
                    <p className="text-sm font-medium flex-1">{i + 1}. {q.questionText}</p>
                    <span className="text-[10px] text-muted-foreground">{q.points}pt</span>
                  </div>
                  {q.questionType === "multiple_choice" && (
                    <ul className="mt-2 ml-7 space-y-0.5 text-xs">
                      {q.options.filter(Boolean).map((o, idx) => (
                        <li key={idx} className={o === q.correctAnswer ? "text-emerald-700 font-semibold" : "text-muted-foreground"}>
                          {String.fromCharCode(65 + idx)}. {o} {o === q.correctAnswer && "✓"}
                        </li>
                      ))}
                    </ul>
                  )}
                  {(q.questionType === "true_false" || q.questionType === "short_answer") && q.correctAnswer && (
                    <p className="mt-1.5 ml-7 text-xs text-emerald-700">Answer: <span className="font-semibold">{q.correctAnswer}</span></p>
                  )}
                  {q.explanation && (
                    <p className="mt-1.5 ml-7 text-xs text-muted-foreground italic">{q.explanation}</p>
                  )}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreview(null)}>Discard</Button>
              <Button onClick={accept} className="gradient-primary text-white gap-1.5">
                <Plus className="h-4 w-4" /> Add {preview.length} questions
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
