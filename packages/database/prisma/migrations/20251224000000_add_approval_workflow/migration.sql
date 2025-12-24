-- Story 4.1: Approval Driven Workflow
-- Add approval workflow fields for task nodes

-- Add approval JSON field to Node table (stores ApprovalPipeline)
ALTER TABLE "Node" ADD COLUMN IF NOT EXISTS "approval" JSONB;

-- Add deliverables JSON field to NodeTask table (stores Deliverable[])
ALTER TABLE "NodeTask" ADD COLUMN IF NOT EXISTS "deliverables" JSONB;

-- Add comment for documentation
COMMENT ON COLUMN "Node"."approval" IS 'Story 4.1: Stores ApprovalPipeline with status, currentStepIndex, steps[], and history[]';
COMMENT ON COLUMN "NodeTask"."deliverables" IS 'Story 4.1: Array of deliverable attachments [{ id, fileId, fileName, uploadedAt }]';
