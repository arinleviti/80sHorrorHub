-- CreateTable
CREATE TABLE "YouTubeQuery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "YouTubeVideo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "youtubeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    CONSTRAINT "YouTubeVideo_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "YouTubeQuery" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EbayQuery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EbayItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "priceValue" TEXT NOT NULL,
    "priceCurrency" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "itemUrl" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    CONSTRAINT "EbayItem_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "EbayQuery" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "releaseDate" DATETIME,
    "overview" TEXT NOT NULL,
    "posterPath" TEXT,
    "popularity" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CastMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "castId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "character" TEXT NOT NULL,
    "profilePath" TEXT,
    "movieId" TEXT NOT NULL,
    CONSTRAINT "CastMember_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CrewMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    CONSTRAINT "CrewMember_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StreamingQuery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "releaseYear" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StreamingOption" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "quality" TEXT,
    "link" TEXT,
    "serviceName" TEXT,
    "queryId" TEXT NOT NULL,
    CONSTRAINT "StreamingOption_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "StreamingQuery" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeQuery_query_key" ON "YouTubeQuery"("query");

-- CreateIndex
CREATE UNIQUE INDEX "EbayQuery_query_key" ON "EbayQuery"("query");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "StreamingQuery_title_releaseYear_country_key" ON "StreamingQuery"("title", "releaseYear", "country");
