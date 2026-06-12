-- DropIndex
DROP INDEX "DonorCityPool_userId_donorKey_settlementId_key";

-- AlterTable
ALTER TABLE "Collection" ALTER COLUMN "goalUah" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Donation" ADD COLUMN     "collectionId" TEXT;

-- AlterTable
ALTER TABLE "DonorCityPool" ADD COLUMN     "collectionId" TEXT;

-- AlterTable
ALTER TABLE "PointEvent" ADD COLUMN     "collectionId" TEXT;

-- CreateIndex
CREATE INDEX "Donation_userId_collectionId_idx" ON "Donation"("userId", "collectionId");

-- CreateIndex
CREATE INDEX "DonorCityPool_userId_collectionId_donorKey_settlementId_idx" ON "DonorCityPool"("userId", "collectionId", "donorKey", "settlementId");

-- CreateIndex
CREATE INDEX "PointEvent_userId_collectionId_idx" ON "PointEvent"("userId", "collectionId");

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorCityPool" ADD CONSTRAINT "DonorCityPool_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointEvent" ADD CONSTRAINT "PointEvent_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Якщо у користувача кілька активних зборів — активним лишається найновіший, решта на паузу
UPDATE "Collection" SET "status" = 'paused'
WHERE "status" = 'active' AND "id" NOT IN (
  SELECT DISTINCT ON ("userId") "id" FROM "Collection"
  WHERE "status" = 'active' ORDER BY "userId", "startAt" DESC
);

-- Інваріант «активний збір — щонайбільше один» гарантує БД, не UI
CREATE UNIQUE INDEX "Collection_one_active_per_user"
  ON "Collection"("userId") WHERE "status" = 'active';

-- Унікальність скарбнички (nullable collectionId → два часткові індекси)
CREATE UNIQUE INDEX "DonorCityPool_user_col_pair_key"
  ON "DonorCityPool"("userId","collectionId","donorKey","settlementId")
  WHERE "collectionId" IS NOT NULL;
CREATE UNIQUE INDEX "DonorCityPool_user_pair_nocol_key"
  ON "DonorCityPool"("userId","donorKey","settlementId")
  WHERE "collectionId" IS NULL;
