-- Story 4.4: Add notification aggregation fields for throttling
-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "batchCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "groupKey" TEXT,
ADD COLUMN     "lastAggregatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Notification_recipientId_groupKey_isRead_idx" ON "Notification"("recipientId", "groupKey", "isRead");
