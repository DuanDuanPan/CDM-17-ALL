// Re-export Prisma client and types
export * from './client';

// Re-export generated types (available after prisma generate)
export type { User, Project, Graph, Node, Edge } from '@prisma/client';
