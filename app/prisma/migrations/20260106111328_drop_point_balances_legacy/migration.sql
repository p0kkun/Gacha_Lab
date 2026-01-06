/*
  Warnings:

  - You are about to drop the `point_balances` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "point_balances" DROP CONSTRAINT "point_balances_userId_fkey";

-- DropTable
DROP TABLE "point_balances";
