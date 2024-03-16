/*
  Warnings:

  - Added the required column `releaseAt` to the `Episode` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalEps` to the `Anime` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Episode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "number" INTEGER NOT NULL,
    "providers" TEXT NOT NULL,
    "dub" BOOLEAN NOT NULL,
    "animeId" TEXT,
    "releaseAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Episode_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Episode" ("animeId", "createdAt", "dub", "id", "number", "providers", "title", "updatedAt") SELECT "animeId", "createdAt", "dub", "id", "number", "providers", "title", "updatedAt" FROM "Episode";
DROP TABLE "Episode";
ALTER TABLE "new_Episode" RENAME TO "Episode";
CREATE TABLE "new_Anime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT,
    "status" TEXT NOT NULL,
    "totalEps" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Anime" ("createdAt", "id", "status", "title", "updatedAt") SELECT "createdAt", "id", "status", "title", "updatedAt" FROM "Anime";
DROP TABLE "Anime";
ALTER TABLE "new_Anime" RENAME TO "Anime";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
