-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user',
ADD COLUMN     "showOnGlobalMap" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL DEFAULT 'app',
    "featuredCollectionId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AppSetting" ADD CONSTRAINT "AppSetting_featuredCollectionId_fkey" FOREIGN KEY ("featuredCollectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

