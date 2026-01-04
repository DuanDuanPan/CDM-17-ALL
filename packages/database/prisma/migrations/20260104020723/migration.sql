-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Template_isPublic_idx" ON "Template"("isPublic");

-- CreateIndex
CREATE INDEX "Template_creatorId_isPublic_idx" ON "Template"("creatorId", "isPublic");
