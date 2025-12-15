/**
 * CDM Database Layer
 *
 * NocoBase-inspired three-layer data abstraction:
 * - Collection: Business model definition
 * - Repository: Data access abstraction
 * - Database: Prisma wrapper with events
 *
 * @example
 * ```typescript
 * import { db, Repository } from '@cdm/database';
 *
 * // Define collections (for documentation/metadata)
 * db.collection({
 *   name: 'mindmaps',
 *   fields: [
 *     { type: 'string', name: 'title', required: true },
 *     { type: 'json', name: 'data' },
 *   ],
 * });
 *
 * // Use repository
 * const mindmapRepo = db.getRepository('mindmap');
 * const mindmaps = await mindmapRepo.find({
 *   filter: { status: 'published' },
 *   appends: ['creator'],
 *   sort: ['-updatedAt'],
 *   page: 1,
 *   pageSize: 20,
 * });
 *
 * // Listen to events
 * db.on('mindmap.afterCreate', async (model) => {
 *   console.log('Created:', model.id);
 * });
 *
 * // Create custom repository
 * class MindmapRepository extends Repository<Mindmap> {
 *   constructor(prisma: PrismaClient) {
 *     super(prisma, 'mindmap');
 *   }
 *
 *   async findByCreator(creatorId: string) {
 *     return this.find({ filter: { creatorId } });
 *   }
 * }
 * ```
 */

// Types
export * from './types';

// Prisma client
export { prisma, PrismaClient } from './client';

// Repository base class
export { Repository } from './Repository';

// Database wrapper
export { Database, db } from './Database';

// Re-export Prisma generated types (available after prisma generate)
export type { User, Project, Graph, Node, Edge } from '@prisma/client';
