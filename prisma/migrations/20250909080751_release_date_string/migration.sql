-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "releaseDate" TEXT,
    "overview" TEXT NOT NULL,
    "posterPath" TEXT,
    "popularity" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Movie" ("createdAt", "id", "overview", "popularity", "posterPath", "releaseDate", "title", "tmdbId", "updatedAt") SELECT "createdAt", "id", "overview", "popularity", "posterPath", "releaseDate", "title", "tmdbId", "updatedAt" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
