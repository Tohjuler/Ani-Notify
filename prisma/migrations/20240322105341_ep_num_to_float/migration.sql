/*
  Warnings:

  - You are about to alter the column `number` on the `Episode` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Episode" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "number" REAL NOT NULL,
    "providers" TEXT NOT NULL,
    "dub" BOOLEAN NOT NULL,
    "animeId" TEXT,
    "releaseAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Episode_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Episode" ("animeId", "createdAt", "dub", "id", "number", "providers", "releaseAt", "title", "updatedAt") SELECT "animeId", "createdAt", "dub", "id", "number", "providers", "releaseAt", "title", "updatedAt" FROM "Episode";
DROP TABLE "Episode";
ALTER TABLE "new_Episode" RENAME TO "Episode";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
