/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Community` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `slug` to the `Community` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Community_name_key";

-- AlterTable
ALTER TABLE "public"."Community" ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Community_slug_key" ON "public"."Community"("slug");
