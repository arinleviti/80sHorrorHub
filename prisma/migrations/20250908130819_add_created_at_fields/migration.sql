-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_EbayQuery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_EbayQuery" ("id", "query", "updatedAt") SELECT "id", "query", "updatedAt" FROM "EbayQuery";
DROP TABLE "EbayQuery";
ALTER TABLE "new_EbayQuery" RENAME TO "EbayQuery";
CREATE UNIQUE INDEX "EbayQuery_query_key" ON "EbayQuery"("query");
CREATE TABLE "new_StreamingQuery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "releaseYear" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_StreamingQuery" ("country", "id", "releaseYear", "title", "updatedAt") SELECT "country", "id", "releaseYear", "title", "updatedAt" FROM "StreamingQuery";
DROP TABLE "StreamingQuery";
ALTER TABLE "new_StreamingQuery" RENAME TO "StreamingQuery";
CREATE UNIQUE INDEX "StreamingQuery_title_releaseYear_country_key" ON "StreamingQuery"("title", "releaseYear", "country");
CREATE TABLE "new_YouTubeQuery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_YouTubeQuery" ("id", "query", "updatedAt") SELECT "id", "query", "updatedAt" FROM "YouTubeQuery";
DROP TABLE "YouTubeQuery";
ALTER TABLE "new_YouTubeQuery" RENAME TO "YouTubeQuery";
CREATE UNIQUE INDEX "YouTubeQuery_query_key" ON "YouTubeQuery"("query");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
