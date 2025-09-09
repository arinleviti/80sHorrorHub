/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `CastMember` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CastMember_name_key" ON "CastMember"("name");
