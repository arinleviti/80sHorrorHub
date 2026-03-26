/*
  Warnings:

  - You are about to drop the column `query` on the `EbayQuery` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EbayQuery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EbayQuery_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EbayQuery" ("createdAt", "id", "updatedAt") SELECT "createdAt", "id", "updatedAt" FROM "EbayQuery";
DROP TABLE "EbayQuery";
ALTER TABLE "new_EbayQuery" RENAME TO "EbayQuery";
CREATE UNIQUE INDEX "EbayQuery_movieId_key" ON "EbayQuery"("movieId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
