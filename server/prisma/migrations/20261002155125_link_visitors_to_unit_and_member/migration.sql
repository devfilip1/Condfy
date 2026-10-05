/*
  Warnings:

  - You are about to drop the column `authorized_by` on the `visitors` table. All the data in the column will be lost.
  - Added the required column `authorized_by_id` to the `visitors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `condominium_id` to the `visitors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_id` to the `visitors` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "visitors" DROP COLUMN "authorized_by",
ADD COLUMN     "authorized_by_id" TEXT NOT NULL,
ADD COLUMN     "condominium_id" TEXT NOT NULL,
ADD COLUMN     "unit_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "visitors_condominium_id_expected_date_idx" ON "visitors"("condominium_id", "expected_date");

-- CreateIndex
CREATE INDEX "visitors_unit_id_condominium_id_idx" ON "visitors"("unit_id", "condominium_id");

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_authorized_by_id_condominium_id_fkey" FOREIGN KEY ("authorized_by_id", "condominium_id") REFERENCES "condominium_members"("user_id", "condominium_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_unit_id_condominium_id_fkey" FOREIGN KEY ("unit_id", "condominium_id") REFERENCES "units"("id", "condominium_id") ON DELETE RESTRICT ON UPDATE CASCADE;
