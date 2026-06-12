-- Дяка вирізана; старі джерела видаляємо разом із полями (дані існують лише в dev).
DELETE FROM "DonationSource";
ALTER TABLE "DonationSource" DROP COLUMN "diakaHashEncrypted";
ALTER TABLE "DonationSource" DROP COLUMN "mercureTopic";
ALTER TABLE "DonationSource" DROP COLUMN "mercureJwt";
ALTER TABLE "DonationSource" ADD COLUMN "monoAccountId" TEXT;
ALTER TABLE "DonationSource" ADD COLUMN "webhookSecret" TEXT;
ALTER TABLE "DonationSource" ADD COLUMN "lastEventAt" TIMESTAMP(3);
ALTER TABLE "DonationSource" ALTER COLUMN "type" SET DEFAULT 'monobank';
CREATE UNIQUE INDEX "DonationSource_webhookSecret_key" ON "DonationSource"("webhookSecret");
