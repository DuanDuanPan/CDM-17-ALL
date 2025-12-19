-- AlterTable
ALTER TABLE "Edge" ADD COLUMN     "metadata" JSONB NOT NULL DEFAULT '{"kind": "hierarchical"}';
