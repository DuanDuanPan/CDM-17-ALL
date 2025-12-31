/**
 * Database Wrapper Class
 *
 * NocoBase-inspired database abstraction layer.
 * Provides collection management, repository access, and event system.
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from './client';
import { Repository } from './Repository';
import {
  CollectionDefinition,
  CreateOptions,
  DatabaseEventHandler,
  DestroyOptions,
  UpdateOptions,
} from './types';

/**
 * Generic Repository implementation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic type parameter for dynamic model types
class GenericRepository<T = any> extends Repository<T> {
  constructor(prisma: PrismaClient, modelName: string) {
    super(prisma, modelName);
  }
}

/**
 * Database wrapper class
 *
 * @example
 * ```typescript
 * const db = new Database();
 *
 * // Define collections
 * db.collection({
 *   name: 'mindmaps',
 *   fields: [
 *     { type: 'string', name: 'title', required: true },
 *     { type: 'json', name: 'data' },
 *     { type: 'belongsTo', name: 'creator', target: 'users' },
 *   ],
 * });
 *
 * // Get repository
 * const mindmapRepo = db.getRepository('mindmaps');
 * const mindmaps = await mindmapRepo.find({
 *   filter: { status: 'published' },
 *   appends: ['creator'],
 * });
 *
 * // Listen to events
 * db.on('mindmaps.afterCreate', async (model) => {
 *   console.log('Mindmap created:', model.id);
 * });
 * ```
 */
export class Database {
  /** Prisma client instance */
  private _prisma: PrismaClient;

  /** Registered collections */
  private collections: Map<string, CollectionDefinition> = new Map();

  /** Repository instances (cached) */
  private repositories: Map<string, Repository> = new Map();

  /** Custom repository classes */
  private repositoryClasses: Map<string, new (prisma: PrismaClient, modelName: string) => Repository> = new Map();

  /** Event handlers */
  private eventHandlers: Map<string, DatabaseEventHandler[]> = new Map();

  constructor(prismaClient?: PrismaClient) {
    this._prisma = prismaClient ?? prisma;
  }

  /**
   * Get Prisma client
   */
  get prisma(): PrismaClient {
    return this._prisma;
  }

  /**
   * Define a collection
   *
   * Note: This is primarily for documentation and runtime metadata.
   * Actual schema changes should be done via Prisma migrations.
   */
  collection(definition: CollectionDefinition): this {
    this.collections.set(definition.name, definition);
    return this;
  }

  /**
   * Get collection definition
   */
  getCollection(name: string): CollectionDefinition | undefined {
    return this.collections.get(name);
  }

  /**
   * Get all collection definitions
   */
  getCollections(): CollectionDefinition[] {
    return Array.from(this.collections.values());
  }

  /**
   * Check if a collection is defined
   */
  hasCollection(name: string): boolean {
    return this.collections.has(name);
  }

  /**
   * Register a custom repository class
   */
  registerRepository<T extends Repository>(
    name: string,
    repositoryClass: new (prisma: PrismaClient, modelName: string) => T
  ): this {
    this.repositoryClasses.set(name, repositoryClass);
    // Clear cached instance if exists
    this.repositories.delete(name);
    return this;
  }

  /**
   * Get repository for a collection
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic type parameter for dynamic model types
  getRepository<T = any>(name: string): Repository<T> {
    // Return cached instance if exists
    if (this.repositories.has(name)) {
      return this.repositories.get(name) as Repository<T>;
    }

    // Create new repository
    const RepositoryClass = this.repositoryClasses.get(name) ?? GenericRepository;
    const repository = new RepositoryClass(this._prisma, name);

    // Wrap with event emission
    const wrappedRepository = this.wrapRepositoryWithEvents(name, repository);

    // Cache and return
    this.repositories.set(name, wrappedRepository);
    return wrappedRepository as Repository<T>;
  }

  /**
   * Wrap repository methods with event emission
   */
  private wrapRepositoryWithEvents(collectionName: string, repository: Repository): Repository {
    const original = repository;
    // Arrow functions to capture `this` context
    const emitEvent = (event: string, data: unknown): Promise<void> => this.emit(event, data);

    // Create a proxy to intercept method calls
    return new Proxy(repository, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);

        if (typeof value !== 'function') {
          return value;
        }

        // Wrap specific methods with events
        if (prop === 'create') {
          return async function (options: CreateOptions) {
            await emitEvent(`${collectionName}.beforeCreate`, options.values);
            const result = await original.create.call(target, options);
            await emitEvent(`${collectionName}.afterCreate`, result);
            return result;
          };
        }

        if (prop === 'update') {
          return async function (options: UpdateOptions) {
            await emitEvent(`${collectionName}.beforeUpdate`, options);
            const result = await original.update.call(target, options);
            await emitEvent(`${collectionName}.afterUpdate`, result);
            return result;
          };
        }

        if (prop === 'destroy') {
          return async function (options: DestroyOptions) {
            await emitEvent(`${collectionName}.beforeDestroy`, options);
            const result = await original.destroy.call(target, options);
            await emitEvent(`${collectionName}.afterDestroy`, result);
            return result;
          };
        }

        return value.bind(target);
      },
    });
  }

  /**
   * Register an event handler
   *
   * @example
   * ```typescript
   * db.on('mindmaps.afterCreate', async (model) => {
   *   // Handle event
   * });
   * ```
   */
  on(event: string, handler: DatabaseEventHandler): this {
    const handlers = this.eventHandlers.get(event) ?? [];
    handlers.push(handler);
    this.eventHandlers.set(event, handlers);
    return this;
  }

  /**
   * Remove an event handler
   */
  off(event: string, handler: DatabaseEventHandler): this {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  /**
   * Emit an event
   */
  async emit(event: string, data: unknown): Promise<void> {
    const handlers = this.eventHandlers.get(event) ?? [];
    for (const handler of handlers) {
      await handler(data);
    }
  }

  /**
   * Execute a transaction
   */
  async transaction<T>(
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
  ): Promise<T> {
    return this._prisma.$transaction(fn);
  }

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    await this._prisma.$connect();
  }

  /**
   * Disconnect from database
   */
  async disconnect(): Promise<void> {
    await this._prisma.$disconnect();
  }

  /**
   * Get database status
   */
  getStatus(): {
    collections: string[];
    repositories: string[];
    eventHandlers: Record<string, number>;
  } {
    const eventHandlerCounts: Record<string, number> = {};
    for (const [event, handlers] of this.eventHandlers) {
      eventHandlerCounts[event] = handlers.length;
    }

    return {
      collections: Array.from(this.collections.keys()),
      repositories: Array.from(this.repositories.keys()),
      eventHandlers: eventHandlerCounts,
    };
  }
}

/**
 * Default database instance
 */
export const db = new Database();
