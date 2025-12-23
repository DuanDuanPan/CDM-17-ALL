-- Story 2.9: Add APP node support

-- Extend NodeType enum to include APP
DO $$
BEGIN
  ALTER TYPE "NodeType" ADD VALUE IF NOT EXISTS 'APP';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create NodeApp table for APP node properties
CREATE TABLE IF NOT EXISTS "NodeApp" (
    "nodeId" TEXT NOT NULL,
    "appSourceType" TEXT DEFAULT 'library',
    "appPath" TEXT,
    "appUrl" TEXT,
    "libraryAppId" TEXT,
    "libraryAppName" TEXT,
    "inputs" JSONB,
    "outputs" JSONB,
    "executionStatus" TEXT DEFAULT 'idle',
    "lastExecutedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NodeApp_pkey" PRIMARY KEY ("nodeId")
);

-- Backfill missing Story 2.8 column if migrations lag behind DB
ALTER TABLE "NodeTask"
  ADD COLUMN IF NOT EXISTS "knowledgeRefs" JSONB;

-- Add foreign key relationship
ALTER TABLE "NodeApp"
  ADD CONSTRAINT "NodeApp_nodeId_fkey"
  FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;
