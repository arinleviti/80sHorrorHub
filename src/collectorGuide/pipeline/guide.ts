// Write → fact check → rewrite loop. The fact check is the only publishing gate; once a draft passes it,
// the judge scores it for the record (logged, never blocking). Every attempt is logged in guide_runs;
// the result is saved in collector_guides as "published", or "flagged" after the last rewrite fails.
import { randomUUID } from "crypto";
import type { EbaySnapshot, Prisma } from "@prisma/client";
import { prisma } from "../../app/services/prisma";
import { GUIDES_KEPT_PER_FILM, MAX_REWRITES, RUN_LOG_RETENTION_DAYS } from "../config";
import type { MarketFacts } from "../types";
import { factCheck } from "./factCheck";
import { judgeGuide, type JudgeResult } from "./judge";
import { snapshotListings } from "./snapshot";
import { writeGuide, type FilmBackground, type GuideContent, type WriterFeedback } from "./writer";

const json = (value: unknown) => value as Prisma.InputJsonValue;

export async function generateGuide(
  snapshot: EbaySnapshot,
  facts: MarketFacts,
  background: FilmBackground
): Promise<"published" | "flagged"> {
  const runId = randomUUID();
  const listings = snapshotListings(snapshot);
  let feedback: WriterFeedback | undefined;
  let draft: GuideContent | undefined;
  let judge: JudgeResult | undefined;

  for (let attempt = 1; attempt <= MAX_REWRITES + 1; attempt++) {
    console.log(`   ✍️  attempt ${attempt}: writing`);
    draft = await writeGuide(background, facts, listings, feedback);

    const check = factCheck(draft, facts, listings, background);
    judge = undefined;
    if (check.passed) {
      console.log(`   ⚖️  attempt ${attempt}: fact check passed, scoring quality (not a gate)`);
      judge = await judgeGuide(background.title, draft);
    }
    const passed = check.passed;

    await prisma.guideRun.create({
      data: {
        runId,
        movieId: snapshot.movieId,
        slug: snapshot.slug,
        attempt,
        draft: json(draft),
        factCheckPassed: check.passed,
        factCheckIssues: json(check.issues),
        judgeScores: judge ? json(judge.scores) : undefined,
        judgeReasons: judge ? json(judge.reasons) : undefined,
        passed,
      },
    });

    if (passed) {
      console.log(`   ✅ attempt ${attempt}: passed ${JSON.stringify(judge!.scores)}`);
      await saveGuide(snapshot, draft, "published", judge);
      return "published";
    }

    console.log(`   ❌ attempt ${attempt}: ${check.issues.length} problem(s)\n      - ${check.issues.join("\n      - ")}`);
    feedback = { previousDraft: draft, problems: check.issues };
  }

  // Out of rewrites: keep the last draft for manual review; the page keeps showing the previous published guide.
  await saveGuide(snapshot, draft!, "flagged", judge);
  return "flagged";
}

async function saveGuide(
  snapshot: EbaySnapshot,
  content: GuideContent,
  status: "published" | "flagged",
  judge: JudgeResult | undefined
) {
  await prisma.collectorGuide.create({
    data: {
      movieId: snapshot.movieId,
      slug: snapshot.slug,
      content: json(content),
      status,
      judgeScores: judge ? json(judge.scores) : undefined,
      snapshotId: snapshot.id,
    },
  });
}

// How guide generation went for one snapshot: was a guide published, and how many runs ended flagged.
export async function guideOutcomesForSnapshot(snapshotId: string): Promise<{ published: boolean; flagged: number }> {
  const guides = await prisma.collectorGuide.findMany({
    where: { snapshotId },
    select: { status: true },
  });
  return {
    published: guides.some((g) => g.status === "published"),
    flagged: guides.filter((g) => g.status === "flagged").length,
  };
}

// Keeps the newest guides per film (plus the latest published one) and the recent run log.
export async function pruneGuidesAndRuns(movieId: string): Promise<{ guides: number; runs: number }> {
  const [recent, latestPublished] = await Promise.all([
    prisma.collectorGuide.findMany({
      where: { movieId },
      orderBy: { createdAt: "desc" },
      take: GUIDES_KEPT_PER_FILM,
      select: { id: true },
    }),
    prisma.collectorGuide.findFirst({
      where: { movieId, status: "published" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
  ]);
  const keep = [...recent.map((g) => g.id), ...(latestPublished ? [latestPublished.id] : [])];

  const guides = await prisma.collectorGuide.deleteMany({
    where: { movieId, id: { notIn: keep } },
  });
  const runs = await prisma.guideRun.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - RUN_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000) } },
  });
  return { guides: guides.count, runs: runs.count };
}
