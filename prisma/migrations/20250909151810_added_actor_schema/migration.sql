/*
  Warnings:

  - The primary key for the `CastMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `castId` on the `CastMember` table. All the data in the column will be lost.
  - You are about to drop the column `imagekitProfilePath` on the `CastMember` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `CastMember` table. All the data in the column will be lost.
  - You are about to drop the column `profilePath` on the `CastMember` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `CastMember` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `actorId` to the `CastMember` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Actor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "profilePath" TEXT,
    "imagekitProfilePath" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CastMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "character" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "actorId" INTEGER NOT NULL,
    CONSTRAINT "CastMember_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CastMember_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CastMember" ("character", "id", "movieId") SELECT "character", "id", "movieId" FROM "CastMember";
DROP TABLE "CastMember";
ALTER TABLE "new_CastMember" RENAME TO "CastMember";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Actor_name_key" ON "Actor"("name");
