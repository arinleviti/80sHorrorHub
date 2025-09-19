-- CreateTable
CREATE TABLE "DiscogQuery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "query" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DiscogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "year" INTEGER,
    "format" JSONB NOT NULL,
    "thumb" TEXT,
    "uri" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    CONSTRAINT "DiscogItem_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "DiscogQuery" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DiscogQuery_query_key" ON "DiscogQuery"("query");
