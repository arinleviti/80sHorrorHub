-- CreateTable
CREATE TABLE "MovieRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    CONSTRAINT "MovieRating_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MovieRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AiDescription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "synopsis" TEXT,
    "funFacts" TEXT,
    "productionContext" TEXT,
    "reception" TEXT,
    "movieId" TEXT NOT NULL,
    CONSTRAINT "AiDescription_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AiDescription" ("funFacts", "id", "movieId", "productionContext", "reception", "synopsis") SELECT "funFacts", "id", "movieId", "productionContext", "reception", "synopsis" FROM "AiDescription";
DROP TABLE "AiDescription";
ALTER TABLE "new_AiDescription" RENAME TO "AiDescription";
CREATE UNIQUE INDEX "AiDescription_movieId_key" ON "AiDescription"("movieId");
CREATE TABLE "new_CastMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "character" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "actorId" INTEGER NOT NULL,
    CONSTRAINT "CastMember_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CastMember_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CastMember" ("actorId", "character", "id", "movieId") SELECT "actorId", "character", "id", "movieId" FROM "CastMember";
DROP TABLE "CastMember";
ALTER TABLE "new_CastMember" RENAME TO "CastMember";
CREATE TABLE "new_Contribution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FAN_FACT',
    "source" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "title" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contribution_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Contribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Contribution" ("body", "createdAt", "id", "movieId", "section", "status", "title", "updatedAt", "upvotes", "userId") SELECT "body", "createdAt", "id", "movieId", "section", "status", "title", "updatedAt", "upvotes", "userId" FROM "Contribution";
DROP TABLE "Contribution";
ALTER TABLE "new_Contribution" RENAME TO "Contribution";
CREATE INDEX "Contribution_movieId_idx" ON "Contribution"("movieId");
CREATE INDEX "Contribution_userId_idx" ON "Contribution"("userId");
CREATE INDEX "Contribution_status_idx" ON "Contribution"("status");
CREATE TABLE "new_CrewMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    CONSTRAINT "CrewMember_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CrewMember" ("id", "job", "movieId", "name") SELECT "id", "job", "movieId", "name" FROM "CrewMember";
DROP TABLE "CrewMember";
ALTER TABLE "new_CrewMember" RENAME TO "CrewMember";
CREATE TABLE "new_DiscogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "format" JSONB NOT NULL,
    "thumb" TEXT,
    "uri" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    CONSTRAINT "DiscogItem_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "DiscogQuery" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DiscogItem" ("format", "id", "queryId", "thumb", "title", "uri", "year") SELECT "format", "id", "queryId", "thumb", "title", "uri", "year" FROM "DiscogItem";
DROP TABLE "DiscogItem";
ALTER TABLE "new_DiscogItem" RENAME TO "DiscogItem";
CREATE TABLE "new_EbayItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "priceValue" TEXT NOT NULL,
    "priceCurrency" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "itemUrl" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    CONSTRAINT "EbayItem_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "EbayQuery" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_EbayItem" ("id", "imageUrl", "itemUrl", "priceCurrency", "priceValue", "queryId", "title") SELECT "id", "imageUrl", "itemUrl", "priceCurrency", "priceValue", "queryId", "title" FROM "EbayItem";
DROP TABLE "EbayItem";
ALTER TABLE "new_EbayItem" RENAME TO "EbayItem";
CREATE TABLE "new_HFSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HFSuggestion_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_HFSuggestion" ("createdAt", "id", "movieId", "updatedAt") SELECT "createdAt", "id", "movieId", "updatedAt" FROM "HFSuggestion";
DROP TABLE "HFSuggestion";
ALTER TABLE "new_HFSuggestion" RENAME TO "HFSuggestion";
CREATE UNIQUE INDEX "HFSuggestion_movieId_key" ON "HFSuggestion"("movieId");
CREATE TABLE "new_StreamingOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "quality" TEXT,
    "link" TEXT,
    "serviceName" TEXT,
    "queryId" TEXT NOT NULL,
    CONSTRAINT "StreamingOption_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "StreamingQuery" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StreamingOption" ("id", "link", "quality", "queryId", "serviceName", "type") SELECT "id", "link", "quality", "queryId", "serviceName", "type" FROM "StreamingOption";
DROP TABLE "StreamingOption";
ALTER TABLE "new_StreamingOption" RENAME TO "StreamingOption";
CREATE TABLE "new_YouTubeVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "youtubeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    CONSTRAINT "YouTubeVideo_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "YouTubeQuery" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_YouTubeVideo" ("id", "queryId", "thumbnail", "title", "url", "youtubeId") SELECT "id", "queryId", "thumbnail", "title", "url", "youtubeId" FROM "YouTubeVideo";
DROP TABLE "YouTubeVideo";
ALTER TABLE "new_YouTubeVideo" RENAME TO "YouTubeVideo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "MovieRating_movieId_userId_key" ON "MovieRating"("movieId", "userId");
