-- CreateTable
CREATE TABLE "ContributionVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "contributionId" TEXT NOT NULL,
    CONSTRAINT "ContributionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContributionVote_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "Contribution" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ContributionVote_userId_contributionId_key" ON "ContributionVote"("userId", "contributionId");
