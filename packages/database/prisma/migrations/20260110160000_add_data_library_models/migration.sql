-- CreateEnum
CREATE TYPE "DataAssetFormat" AS ENUM ('STEP', 'IGES', 'STL', 'OBJ', 'FBX', 'GLTF', 'PDF', 'DOCX', 'XLSX', 'JSON', 'XML', 'CSV', 'IMAGE', 'VIDEO', 'OTHER');

-- CreateTable
CREATE TABLE "DataFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "graphId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "format" "DataAssetFormat" NOT NULL DEFAULT 'OTHER',
    "fileSize" INTEGER,
    "storagePath" TEXT,
    "thumbnail" TEXT,
    "version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "graphId" TEXT NOT NULL,
    "folderId" TEXT,
    "creatorId" TEXT,
    "secretLevel" TEXT NOT NULL DEFAULT 'internal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeDataLink" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL DEFAULT 'reference',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodeDataLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DataFolder_graphId_idx" ON "DataFolder"("graphId");

-- CreateIndex
CREATE INDEX "DataFolder_parentId_idx" ON "DataFolder"("parentId");

-- CreateIndex
CREATE INDEX "DataAsset_graphId_idx" ON "DataAsset"("graphId");

-- CreateIndex
CREATE INDEX "DataAsset_folderId_idx" ON "DataAsset"("folderId");

-- CreateIndex
CREATE INDEX "DataAsset_format_idx" ON "DataAsset"("format");

-- CreateIndex
CREATE INDEX "DataAsset_tags_idx" ON "DataAsset"("tags");

-- CreateIndex
CREATE INDEX "DataAsset_name_idx" ON "DataAsset"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NodeDataLink_nodeId_assetId_key" ON "NodeDataLink"("nodeId", "assetId");

-- CreateIndex
CREATE INDEX "NodeDataLink_nodeId_idx" ON "NodeDataLink"("nodeId");

-- CreateIndex
CREATE INDEX "NodeDataLink_assetId_idx" ON "NodeDataLink"("assetId");

-- AddForeignKey
ALTER TABLE "DataFolder" ADD CONSTRAINT "DataFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DataFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataFolder" ADD CONSTRAINT "DataFolder_graphId_fkey" FOREIGN KEY ("graphId") REFERENCES "Graph"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataAsset" ADD CONSTRAINT "DataAsset_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DataFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataAsset" ADD CONSTRAINT "DataAsset_graphId_fkey" FOREIGN KEY ("graphId") REFERENCES "Graph"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeDataLink" ADD CONSTRAINT "NodeDataLink_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeDataLink" ADD CONSTRAINT "NodeDataLink_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "DataAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
