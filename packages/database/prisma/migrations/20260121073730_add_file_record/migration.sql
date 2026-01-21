-- CreateEnum
CREATE TYPE "StorageType" AS ENUM ('LOCAL', 'S3', 'MINIO');

-- CreateEnum
CREATE TYPE "FileOwnerType" AS ENUM ('DELIVERABLE', 'DATA_ASSET', 'ATTACHMENT', 'TEMPLATE');

-- AlterEnum
ALTER TYPE "DataAssetFormat" ADD VALUE 'VTK';

-- CreateTable
CREATE TABLE "FileRecord" (
    "id" TEXT NOT NULL,
    "graphId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "storageType" "StorageType" NOT NULL DEFAULT 'LOCAL',
    "thumbnailPath" TEXT,
    "previewable" BOOLEAN NOT NULL DEFAULT false,
    "ownerType" "FileOwnerType",
    "ownerId" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FileRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FileRecord_graphId_idx" ON "FileRecord"("graphId");

-- CreateIndex
CREATE INDEX "FileRecord_ownerType_ownerId_idx" ON "FileRecord"("ownerType", "ownerId");

-- AddForeignKey
ALTER TABLE "FileRecord" ADD CONSTRAINT "FileRecord_graphId_fkey" FOREIGN KEY ("graphId") REFERENCES "Graph"("id") ON DELETE CASCADE ON UPDATE CASCADE;
