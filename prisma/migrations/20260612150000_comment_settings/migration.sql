-- AlterTable
ALTER TABLE "User" ADD COLUMN     "commentMode" TEXT NOT NULL DEFAULT 'mask',
ADD COLUMN     "bannedWordsAdded" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bannedWordsAllowed" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "showCommentPublic" BOOLEAN NOT NULL DEFAULT true;
