-- CreateTable
CREATE TABLE "public"."ebay_snapshots" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sourceUpdatedAt" TIMESTAMP(3) NOT NULL,
    "listings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ebay_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."collector_guides" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "judgeScores" JSONB,
    "snapshotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collector_guides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."guide_runs" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL,
    "draft" JSONB NOT NULL,
    "factCheckPassed" BOOLEAN NOT NULL,
    "factCheckIssues" JSONB,
    "judgeScores" JSONB,
    "judgeReasons" JSONB,
    "passed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guide_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ebay_snapshots_movieId_createdAt_idx" ON "public"."ebay_snapshots"("movieId", "createdAt");

-- CreateIndex
CREATE INDEX "collector_guides_slug_status_createdAt_idx" ON "public"."collector_guides"("slug", "status", "createdAt");

-- CreateIndex
CREATE INDEX "guide_runs_movieId_createdAt_idx" ON "public"."guide_runs"("movieId", "createdAt");



-- Block access through Supabase's public API (Prisma connects as the owner and bypasses RLS)
ALTER TABLE "public"."ebay_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."collector_guides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."guide_runs" ENABLE ROW LEVEL SECURITY;
