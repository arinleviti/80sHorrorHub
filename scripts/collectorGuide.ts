// npm run collectorGuide                     → for each beta film whose eBay cache changed: snapshot, facts, guide
// npm run collectorGuide -- --dry-run         → compute and print facts only; writes nothing, no Claude calls
// npm run collectorGuide -- --snapshot-only   → save snapshots, skip the guide (no Claude calls)
// npm run collectorGuide -- --force           → regenerate guides from the latest snapshot even if the cache is unchanged
// npm run collectorGuide -- --film the-thing  → only this film (combine with any flag above)
import { prisma } from "../src/app/services/prisma";
import { COLLECTOR_GUIDE_SLUGS, FLAGGED_RETRY_RUNS, SNAPSHOT_RETENTION_DAYS } from "../src/collectorGuide/config";
import {
  getSnapshots,
  pruneSnapshots,
  readEbayCache,
  saveSnapshot,
  toListingSet,
} from "../src/collectorGuide/pipeline/snapshot";
import { computeFacts } from "../src/collectorGuide/pipeline/facts";
import { readFilmBackground } from "../src/collectorGuide/pipeline/background";
import { generateGuide, guideOutcomesForSnapshot, pruneGuidesAndRuns } from "../src/collectorGuide/pipeline/guide";
import type { MarketFacts, WindowFacts } from "../src/collectorGuide/types";

type Options = { dryRun: boolean; snapshotOnly: boolean; force: boolean };

const describeWindow = (label: string, w: WindowFacts | null) =>
  w ? `${label}: ${w.newCount} new, ${w.goneCount} gone vs ${w.baselineDate} (${w.turnover})` : `${label}: not enough history`;

function summary(facts: MarketFacts) {
  return [
    `${facts.totalListings} listings, tracked since ${facts.trackedSince}`,
    describeWindow("week", facts.week),
    describeWindow("month", facts.month),
    `${facts.longListed.length} long-listed`,
  ].join(" | ");
}

async function runFilm(slug: string, opts: Options) {
  // cache here is the preexisting eBay cache, independent from the AI guide generator.
  const cache = await readEbayCache(slug);
  if (!cache) {
    console.log(`⏭️  ${slug}: no eBay cache yet, skipping`);
    return;
  }

  // The cache's timestamp only moves when the site refetched from eBay, so equal = nothing new.
  //getSnapshots() reads from the new table, ebay_snapshots, the one the Collector's Guide created.
  const history = await getSnapshots(cache.movieId);
  const latest = history.at(-1);
  const changed = !latest || latest.sourceUpdatedAt.getTime() !== cache.sourceUpdatedAt.getTime();

  if (!changed && !opts.force) {
    // Same data as last time: only work if its guide was flagged, and retry a limited number of times.
    const outcome = await guideOutcomesForSnapshot(latest!.id);
    const retry = !outcome.published && outcome.flagged > 0 && outcome.flagged <= FLAGGED_RETRY_RUNS;
    if (!retry) {
      console.log(`⏭️  ${slug}: eBay cache unchanged since ${cache.sourceUpdatedAt.toISOString()}, skipping`);
      return;
    }
    console.log(`🔁 ${slug}: last guide was flagged, retry ${outcome.flagged} of ${FLAGGED_RETRY_RUNS}`);
  }

  // New data is compared with every kept snapshot; --force and flagged retries regenerate from
  // the latest snapshot and compare it with the ones before it.
  const current = changed
    ? { takenAt: new Date(), listings: cache.listings }
    : toListingSet(latest!);
  const earlier = changed ? history : history.slice(0, -1);
  const facts = computeFacts(earlier.map(toListingSet), current);
  console.log(`📊 ${slug}: ${summary(facts)}`);

  if (opts.dryRun) {
    console.log(JSON.stringify(facts, null, 2));
    console.log(`🧪 ${slug}: dry run, nothing saved`);
    return;
  }

  let snapshot = latest!;
  if (changed) {
    snapshot = await saveSnapshot(cache);
    const pruned = await pruneSnapshots(cache.movieId, SNAPSHOT_RETENTION_DAYS);
    console.log(`💾 ${slug}: saved snapshot ${snapshot.id}${pruned ? `, pruned ${pruned} old` : ""}`);
  }
  if (opts.snapshotOnly) return;

  const background = await readFilmBackground(cache.movieId);
  if (!background) {
    console.log(`⏭️  ${slug}: no collector description in the database, skipping the guide`);
    return;
  }

  const status = await generateGuide(snapshot, facts, background);
  const pruned = await pruneGuidesAndRuns(cache.movieId);
  console.log(
    `${status === "published" ? "📰" : "🚩"} ${slug}: guide ${status}` +
      (pruned.guides || pruned.runs ? ` (pruned ${pruned.guides} guides, ${pruned.runs} runs)` : "")
  );
}

async function main() {
  const args = process.argv.slice(2);
  const opts: Options = {
    dryRun: args.includes("--dry-run"),
    snapshotOnly: args.includes("--snapshot-only"),
    force: args.includes("--force"),
  };
  const filmIndex = args.indexOf("--film");
  const slugs = filmIndex >= 0 ? [args[filmIndex + 1]] : COLLECTOR_GUIDE_SLUGS;

  for (const slug of slugs) {
    try {
      await runFilm(slug, opts);
    } catch (err) {
      // One film failing shouldn't stop the others.
      console.error(`❌ ${slug}:`, err);
      process.exitCode = 1;
    }
  }
}

main().finally(() => prisma.$disconnect());
