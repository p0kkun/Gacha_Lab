/*
  Warnings:

  - You are about to drop the column `points` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_points_idx";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "points";
