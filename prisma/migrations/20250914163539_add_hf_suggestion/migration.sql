-- CreateTable
CREATE TABLE "HFSuggestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "movieId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HFSuggestion_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_SuggestedMovies" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_SuggestedMovies_A_fkey" FOREIGN KEY ("A") REFERENCES "HFSuggestion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_SuggestedMovies_B_fkey" FOREIGN KEY ("B") REFERENCES "Movie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HFSuggestion_movieId_key" ON "HFSuggestion"("movieId");

-- CreateIndex
CREATE UNIQUE INDEX "_SuggestedMovies_AB_unique" ON "_SuggestedMovies"("A", "B");

-- CreateIndex
CREATE INDEX "_SuggestedMovies_B_index" ON "_SuggestedMovies"("B");
