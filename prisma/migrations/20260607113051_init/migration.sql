-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('recognized', 'unrecognized');

-- CreateEnum
CREATE TYPE "PointSource" AS ENUM ('donation', 'pool_flush', 'admin');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonationSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'diaka',
    "diakaHashEncrypted" TEXT NOT NULL,
    "mercureTopic" TEXT,
    "mercureJwt" TEXT,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DonationSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "katottg" TEXT,
    "name" TEXT NOT NULL,
    "nameNorm" TEXT NOT NULL,
    "type" TEXT,
    "oblast" TEXT,
    "raion" TEXT,
    "hromada" TEXT,
    "population" INTEGER,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementAlias" (
    "id" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "aliasNorm" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "SettlementAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceId" TEXT,
    "externalId" TEXT NOT NULL,
    "donorName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "message" TEXT NOT NULL,
    "settlementId" TEXT,
    "streamId" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'unrecognized',
    "pointsAwarded" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DonorCityPool" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "donorKey" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "accumulatedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "DonorCityPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "settlementId" TEXT NOT NULL,
    "points" DECIMAL(14,4) NOT NULL,
    "source" "PointSource" NOT NULL,
    "donationId" TEXT,
    "streamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stream" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "collectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Stream_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goalUah" DECIMAL(12,2) NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "DonationSource_userId_idx" ON "DonationSource"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_katottg_key" ON "Settlement"("katottg");

-- CreateIndex
CREATE INDEX "Settlement_nameNorm_idx" ON "Settlement"("nameNorm");

-- CreateIndex
CREATE INDEX "Settlement_nameNorm_trgm" ON "Settlement" USING GIN ("nameNorm" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "SettlementAlias_settlementId_idx" ON "SettlementAlias"("settlementId");

-- CreateIndex
CREATE INDEX "SettlementAlias_aliasNorm_idx" ON "SettlementAlias"("aliasNorm");

-- CreateIndex
CREATE INDEX "SettlementAlias_aliasNorm_trgm" ON "SettlementAlias" USING GIN ("aliasNorm" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Donation_userId_createdAt_id_idx" ON "Donation"("userId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Donation_userId_amount_idx" ON "Donation"("userId", "amount");

-- CreateIndex
CREATE INDEX "Donation_userId_status_idx" ON "Donation"("userId", "status");

-- CreateIndex
CREATE INDEX "Donation_userId_settlementId_idx" ON "Donation"("userId", "settlementId");

-- CreateIndex
CREATE INDEX "Donation_userId_streamId_idx" ON "Donation"("userId", "streamId");

-- CreateIndex
CREATE INDEX "Donation_donorName_idx" ON "Donation" USING GIN ("donorName" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "Donation_userId_externalId_key" ON "Donation"("userId", "externalId");

-- CreateIndex
CREATE INDEX "DonorCityPool_userId_settlementId_idx" ON "DonorCityPool"("userId", "settlementId");

-- CreateIndex
CREATE UNIQUE INDEX "DonorCityPool_userId_donorKey_settlementId_key" ON "DonorCityPool"("userId", "donorKey", "settlementId");

-- CreateIndex
CREATE INDEX "PointEvent_userId_createdAt_idx" ON "PointEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PointEvent_userId_settlementId_idx" ON "PointEvent"("userId", "settlementId");

-- CreateIndex
CREATE INDEX "PointEvent_userId_streamId_idx" ON "PointEvent"("userId", "streamId");

-- CreateIndex
CREATE INDEX "Stream_userId_startedAt_idx" ON "Stream"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "Stream_collectionId_idx" ON "Stream"("collectionId");

-- CreateIndex
CREATE INDEX "Collection_userId_idx" ON "Collection"("userId");

-- AddForeignKey
ALTER TABLE "DonationSource" ADD CONSTRAINT "DonationSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementAlias" ADD CONSTRAINT "SettlementAlias_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DonationSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorCityPool" ADD CONSTRAINT "DonorCityPool_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DonorCityPool" ADD CONSTRAINT "DonorCityPool_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointEvent" ADD CONSTRAINT "PointEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointEvent" ADD CONSTRAINT "PointEvent_settlementId_fkey" FOREIGN KEY ("settlementId") REFERENCES "Settlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointEvent" ADD CONSTRAINT "PointEvent_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointEvent" ADD CONSTRAINT "PointEvent_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "Stream"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stream" ADD CONSTRAINT "Stream_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
