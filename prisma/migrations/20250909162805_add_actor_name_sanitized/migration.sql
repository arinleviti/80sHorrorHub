/*
  Warnings:

  - Added the required column `actorNameSanitized` to the `Actor` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Actor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "profilePath" TEXT,
    "imagekitProfilePath" TEXT,
    "actorNameSanitized" TEXT NOT NULL
);
INSERT INTO "new_Actor" ("id", "imagekitProfilePath", "name", "profilePath") SELECT "id", "imagekitProfilePath", "name", "profilePath" FROM "Actor";
DROP TABLE "Actor";
ALTER TABLE "new_Actor" RENAME TO "Actor";
CREATE UNIQUE INDEX "Actor_name_key" ON "Actor"("name");
CREATE UNIQUE INDEX "Actor_actorNameSanitized_key" ON "Actor"("actorNameSanitized");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
