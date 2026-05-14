import { Router, type IRouter } from "express";
import OpenAI from "openai";

const router: IRouter = Router();

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "missing",
    });
  }
  return _openai;
}

interface GeneratedQuestion {
  questionText: string;
  questionType: "multiple_choice" | "true_false" | "short_answer" | "essay";
  points: number;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
}

router.post("/ai/generate-questions", async (req, res): Promise<void> => {
  const session = (req as any).session;
  if (!session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const {
    topic,
    count = 5,
    difficulty = "medium",
    questionTypes = ["multiple_choice"],
    courseContext = "",
    instructions = "",
  } = req.body ?? {};

  if (!topic || typeof topic !== "string" || !topic.trim()) {
    res.status(400).json({ error: "topic is required" });
    return;
  }

  const safeCount = Math.max(1, Math.min(20, parseInt(String(count), 10) || 5));
  const allowedTypes = (Array.isArray(questionTypes) ? questionTypes : ["multiple_choice"])
    .filter(t => ["multiple_choice", "true_false", "short_answer", "essay"].includes(t));
  const types = allowedTypes.length ? allowedTypes : ["multiple_choice"];

  const systemPrompt = `You are an expert educator and assessment designer for the Nasser Centre for Science & Technology (NCST). Generate high-quality quiz questions in valid JSON only.

Rules:
- Output ONLY valid JSON matching the schema. No markdown, no commentary.
- Each multiple_choice question MUST have exactly 4 options (strings) and a correctAnswer that EXACTLY equals one of the options.
- true_false questions MUST have correctAnswer of either "True" or "False" (no options field).
- short_answer questions MUST have a concise correctAnswer string (1-5 words ideally).
- essay questions should have NO correctAnswer (manual grading).
- Provide a brief explanation for every question.
- Vary cognitive levels (recall, application, analysis) appropriately for the difficulty.
- Difficulty levels: easy = recall/definition, medium = application, hard = analysis/synthesis.
- Questions must be academically sound, unambiguous, and free of spelling errors.

Schema:
{
  "questions": [
    {
      "questionText": string,
      "questionType": "multiple_choice" | "true_false" | "short_answer" | "essay",
      "points": number (1-5),
      "options": string[] (only for multiple_choice, exactly 4),
      "correctAnswer": string (omit for essay),
      "explanation": string
    }
  ]
}`;

  const userPrompt = `Generate ${safeCount} ${difficulty}-difficulty quiz questions about: "${topic.trim()}".

Allowed question types: ${types.join(", ")}.
${courseContext ? `Course context: ${courseContext}\n` : ""}${instructions ? `Additional instructions: ${instructions}\n` : ""}
Mix question types from the allowed list. Return ONLY the JSON object.`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    let parsed: { questions?: GeneratedQuestion[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      req.log.error({ content }, "AI returned non-JSON content");
      res.status(502).json({ error: "AI returned invalid JSON. Please try again." });
      return;
    }

    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    const cleaned: GeneratedQuestion[] = questions
      .filter(q => q && typeof q.questionText === "string" && q.questionText.trim())
      .map(q => {
        const type = ["multiple_choice", "true_false", "short_answer", "essay"].includes(q.questionType)
          ? q.questionType
          : "multiple_choice";
        const points = Math.max(1, Math.min(5, Number(q.points) || 1));
        const base: GeneratedQuestion = {
          questionText: q.questionText.trim(),
          questionType: type,
          points,
          explanation: typeof q.explanation === "string" ? q.explanation.trim() : "",
        };
        if (type === "multiple_choice") {
          const opts = Array.isArray(q.options) ? q.options.filter(o => typeof o === "string" && o.trim()).slice(0, 6) : [];
          base.options = opts.length >= 2 ? opts : ["Option A", "Option B", "Option C", "Option D"];
          const ca = typeof q.correctAnswer === "string" ? q.correctAnswer.trim() : "";
          base.correctAnswer = base.options.includes(ca) ? ca : base.options[0];
        } else if (type === "true_false") {
          base.correctAnswer = q.correctAnswer === "False" ? "False" : "True";
        } else if (type === "short_answer") {
          base.correctAnswer = typeof q.correctAnswer === "string" ? q.correctAnswer.trim() : "";
        }
        return base;
      });

    if (cleaned.length === 0) {
      res.status(502).json({ error: "AI did not return any usable questions. Please refine your topic." });
      return;
    }

    res.json({ questions: cleaned });
  } catch (err: any) {
    req.log.error({ err: err?.message ?? err }, "AI generation failed");
    res.status(500).json({ error: "AI generation failed. Please try again." });
  }
});

export default router;
