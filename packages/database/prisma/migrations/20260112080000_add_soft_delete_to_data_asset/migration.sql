-- Add soft delete fields to DataAsset table
-- Story 9.8: Data Asset Delete Feature

-- Add soft delete columns
ALTER TABLE "DataAsset" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DataAsset" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add index for efficient trash queries
CREATE INDEX IF NOT EXISTS "DataAsset_graphId_isDeleted_idx" ON "DataAsset"("graphId", "isDeleted");
