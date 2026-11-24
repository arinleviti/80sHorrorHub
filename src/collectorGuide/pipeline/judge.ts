// Claude call #2: scores the draft against a written rubric. Facts are checked in code, not here.
import { z } from "zod";
import { JUDGE_MIN_AVERAGE, JUDGE_MIN_SCORE } from "../config";
import { askStructured } from "./claude";
import type { GuideContent } from "./writer";

const Criterion = z.object({
  score: z.number().int().describe("1 (poor) to 5 (excellent)"),
  reason: z.string().describe("One or two sentences quoting or pointing at the draft"),
});

const JudgeSchema = z.object({
  tone: Criterion,
  structure: Criterion,
  collectorUsefulness: Criterion,
  specificity: Criterion,
  greatVsOkay: Criterion,
  summary: z.string().describe("One sentence: the main thing that would make this guide better"),
});

export type JudgeCriterion = Exclude<keyof z.infer<typeof JudgeSchema>, "summary">;
export type JudgeResult = {
  passed: boolean;
  scores: Record<JudgeCriterion, number>;
  reasons: Record<JudgeCriterion, string> & { summary: string };
};

const CRITERIA: JudgeCriterion[] = ["tone", "structure", "collectorUsefulness", "specificity", "greatVsOkay"];

const SYSTEM = `You are a demanding editor reviewing a Collector's Guide for a horror memorabilia website. Score the draft from 1 to 5 on each criterion. Be strict: a 5 is rare, a 3 means acceptable but unremarkable.

- tone: Written for collectors by someone who knows the hobby — confident and enthusiastic without hype, clichés or sales language.
- structure: The two sections do their jobs (what to collect / what's on the market now) without repeating each other, and are split into short, readable paragraphs. Readers already know the film, so plot summary or film appreciation counts against structure.
- collectorUsefulness: A collector finishes knowing what to look for, what things cost right now, and where the entry point is.
- specificity: Names actual listings, categories and prices rather than generic statements that could apply to any film.
- greatVsOkay: Would a seasoned collector find this genuinely insightful (5), or is it a competent but forgettable summary (3), or filler (1)?

The writer may only use a short film background and the current eBay listings (titles, categories, prices, and changes since the previous check). Judge how well the draft uses that material. Do not penalise it, or ask it, for information it cannot have, such as authentication or grading guides, print runs, or sales history.

Do not check facts or numbers; that is done separately. For each criterion give the score and a short reason that points at the draft.`;

export async function judgeGuide(filmTitle: string, draft: GuideContent): Promise<JudgeResult> {
  const result = await askStructured(
    JudgeSchema,
    SYSTEM,
    `Film: ${filmTitle}\n\nDraft:\n${JSON.stringify(draft, null, 2)}`
  );

  const scores = {} as Record<JudgeCriterion, number>;
  const reasons = { summary: result.summary } as JudgeResult["reasons"];
  for (const c of CRITERIA) {
    scores[c] = Math.min(5, Math.max(1, result[c].score));
    reasons[c] = result[c].reason;
  }

  const values = Object.values(scores);
  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const passed = values.every((s) => s >= JUDGE_MIN_SCORE) && average >= JUDGE_MIN_AVERAGE;

  return { passed, scores, reasons };
}

// Turns a failed judgement into rewrite instructions for the writer.
export function judgeProblems(judge: JudgeResult): string[] {
  const low = CRITERIA.filter((c) => judge.scores[c] < 4).map(
    (c) => `Editor scored ${c} ${judge.scores[c]}/5: ${judge.reasons[c]}`
  );
  return [...low, `Editor's main note: ${judge.reasons.summary}`];
}
