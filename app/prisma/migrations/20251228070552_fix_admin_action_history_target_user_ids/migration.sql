/*
  Warnings:

  - The `targetUserIds` column on the `admin_action_histories` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "admin_action_histories" DROP COLUMN "targetUserIds",
ADD COLUMN     "targetUserIds" JSONB;
