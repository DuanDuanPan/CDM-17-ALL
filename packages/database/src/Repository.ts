/**
 * Repository Base Class
 *
 * NocoBase-inspired repository pattern for data access abstraction.
 * Wraps Prisma operations with a consistent interface.
 */

import { PrismaClient } from '@prisma/client';
import {
  FindOptions,
  FindOneOptions,
  CreateOptions,
  UpdateOptions,
  DestroyOptions,
  PaginatedResult,
  FilterCondition,
  FilterOperators,
} from './types';

type PrismaDelegate<TModel> = {
  findMany: (args?: unknown) => Promise<TModel[]>;
  count: (args?: unknown) => Promise<number>;
  findFirst: (args?: unknown) => Promise<TModel | null>;
  create: (args: unknown) => Promise<TModel>;
  createMany: (args: unknown) => Promise<{ count: number }>;
  update: (args: unknown) => Promise<TModel>;
  updateMany: (args: unknown) => Promise<{ count: number }>;
  delete: (args: unknown) => Promise<TModel>;
  deleteMany: (args: unknown) => Promise<{ count: number }>;
};

type IncludeTree = Record<string, true | { include: IncludeTree }>;

/**
 * Abstract Repository base class
 *
 * @example
 * ```typescript
 * class MindmapRepository extends Repository<Mindmap> {
 *   constructor(prisma: PrismaClient) {
 *     super(prisma, 'mindmap');
 *   }
 *
 *   // Custom methods
 *   async findByCreator(creatorId: string) {
 *     return this.find({ filter: { creatorId } });
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic type parameter for dynamic Prisma model types
export abstract class Repository<T = any> {
  protected prisma: PrismaClient;
  protected modelName: string;

  constructor(prisma: PrismaClient, modelName: string) {
    this.prisma = prisma;
    this.modelName = modelName;
  }

  /**
   * Get the Prisma model delegate
   */
  protected get model(): PrismaDelegate<T> {
    return (this.prisma as unknown as Record<string, PrismaDelegate<T>>)[this.modelName];
  }

  /**
   * Convert filter to Prisma where clause
   */
  protected buildWhere(filter?: FilterCondition): Record<string, unknown> | undefined {
    if (!filter) return undefined;

    const where: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(filter)) {
      if (key === '$and') {
        where.AND = (value as FilterCondition[]).map((f) => this.buildWhere(f));
      } else if (key === '$or') {
        where.OR = (value as FilterCondition[]).map((f) => this.buildWhere(f));
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Handle operators
        const ops = value as FilterOperators;
        const prismaOps: Record<string, unknown> = {};

        if (ops.$eq !== undefined) prismaOps.equals = ops.$eq;
        if (ops.$ne !== undefined) prismaOps.not = ops.$ne;
        if (ops.$gt !== undefined) prismaOps.gt = ops.$gt;
        if (ops.$gte !== undefined) prismaOps.gte = ops.$gte;
        if (ops.$lt !== undefined) prismaOps.lt = ops.$lt;
        if (ops.$lte !== undefined) prismaOps.lte = ops.$lte;
        if (ops.$in !== undefined) prismaOps.in = ops.$in;
        if (ops.$notIn !== undefined) prismaOps.notIn = ops.$notIn;
        if (typeof ops.$like === 'string') prismaOps.contains = ops.$like.replace(/%/g, '');
        if (typeof ops.$iLike === 'string') {
          prismaOps.contains = ops.$iLike.replace(/%/g, '');
          prismaOps.mode = 'insensitive';
        }
        if (typeof ops.$isNull === 'boolean') {
          if (ops.$isNull) {
            prismaOps.equals = null;
          } else {
            prismaOps.not = null;
          }
        }

        where[key] = Object.keys(prismaOps).length > 0 ? prismaOps : value;
      } else {
        where[key] = value;
      }
    }

    return where;
  }

  /**
   * Convert sort array to Prisma orderBy
   */
  protected buildOrderBy(sort?: string[]): Record<string, string>[] | undefined {
    if (!sort || sort.length === 0) return undefined;

    return sort.map((field) => {
      if (field.startsWith('-')) {
        return { [field.slice(1)]: 'desc' };
      }
      return { [field]: 'asc' };
    });
  }

  /**
   * Convert fields array to Prisma select
   */
  protected buildSelect(fields?: string[]): Record<string, boolean> | undefined {
    if (!fields || fields.length === 0) return undefined;

    const select: Record<string, boolean> = {};
    for (const field of fields) {
      select[field] = true;
    }
    return select;
  }

  /**
   * Convert appends array to Prisma include
   */
  protected buildInclude(appends?: string[]): IncludeTree | undefined {
    if (!appends || appends.length === 0) return undefined;

    const include: IncludeTree = {};
    for (const relation of appends) {
      // Support nested relations like 'creator.profile'
      const parts = relation.split('.');
      let current = include;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = true;
        } else {
          const existing = current[part];
          if (!existing || existing === true || !('include' in existing)) {
            current[part] = { include: {} };
          }
          current = (current[part] as { include: IncludeTree }).include;
        }
      }
    }
    return include;
  }

  /**
   * Find multiple records
   */
  async find(options: FindOptions = {}): Promise<T[]> {
    const {
      filter,
      fields,
      appends,
      sort,
      page,
      pageSize,
      offset,
      limit,
    } = options;

    const query: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, string>[];
      select?: Record<string, boolean>;
      include?: IncludeTree;
      skip?: number;
      take?: number;
    } = {
      where: this.buildWhere(filter),
      orderBy: this.buildOrderBy(sort),
    };

    // Handle select/include (mutually exclusive in Prisma)
    if (fields && fields.length > 0) {
      query.select = this.buildSelect(fields) ?? {};
      // If appends are also requested, merge them into select
      if (appends && appends.length > 0) {
        for (const relation of appends) {
          query.select[relation] = true;
        }
      }
    } else if (appends && appends.length > 0) {
      query.include = this.buildInclude(appends);
    }

    // Handle pagination
    if (page && pageSize) {
      query.skip = (page - 1) * pageSize;
      query.take = pageSize;
    } else if (offset !== undefined || limit !== undefined) {
      if (offset !== undefined) query.skip = offset;
      if (limit !== undefined) query.take = limit;
    }

    return this.model.findMany(query);
  }

  /**
   * Find multiple records with pagination info
   */
  async findAndCount(options: FindOptions = {}): Promise<PaginatedResult<T>> {
    const { filter, page = 1, pageSize = 20 } = options;

    const [data, total] = await Promise.all([
      this.find(options),
      this.model.count({ where: this.buildWhere(filter) }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Find one record
   */
  async findOne(options: FindOneOptions = {}): Promise<T | null> {
    const { filter, filterByTk, fields, appends } = options;

    const query: {
      where?: Record<string, unknown>;
      select?: Record<string, boolean>;
      include?: IncludeTree;
    } = {};

    if (filterByTk !== undefined) {
      query.where = { id: filterByTk };
    } else if (filter) {
      query.where = this.buildWhere(filter);
    }

    // Handle select/include
    if (fields && fields.length > 0) {
      query.select = this.buildSelect(fields) ?? {};
      if (appends && appends.length > 0) {
        for (const relation of appends) {
          query.select[relation] = true;
        }
      }
    } else if (appends && appends.length > 0) {
      query.include = this.buildInclude(appends);
    }

    return this.model.findFirst(query);
  }

  /**
   * Find by primary key
   */
  async findByTk(tk: string | number, options: Omit<FindOneOptions, 'filterByTk' | 'filter'> = {}): Promise<T | null> {
    return this.findOne({ ...options, filterByTk: tk });
  }

  /**
   * Create a record
   */
  async create(options: CreateOptions): Promise<T> {
    return this.model.create({
      data: options.values,
    });
  }

  /**
   * Create multiple records
   */
  async createMany(records: Record<string, unknown>[]): Promise<{ count: number }> {
    return this.model.createMany({
      data: records,
    });
  }

  /**
   * Update records
   */
  async update(options: UpdateOptions): Promise<T> {
    const { filter, filterByTk, values } = options;

    const where = filterByTk !== undefined
      ? { id: filterByTk }
      : this.buildWhere(filter);

    return this.model.update({
      where,
      data: values,
    });
  }

  /**
   * Update multiple records
   */
  async updateMany(options: UpdateOptions): Promise<{ count: number }> {
    const { filter, values } = options;

    return this.model.updateMany({
      where: this.buildWhere(filter),
      data: values,
    });
  }

  /**
   * Delete records
   */
  async destroy(options: DestroyOptions): Promise<T> {
    const { filter, filterByTk } = options;

    const where = filterByTk !== undefined
      ? { id: filterByTk }
      : this.buildWhere(filter);

    return this.model.delete({ where });
  }

  /**
   * Delete multiple records
   */
  async destroyMany(options: DestroyOptions): Promise<{ count: number }> {
    const { filter } = options;

    return this.model.deleteMany({
      where: this.buildWhere(filter),
    });
  }

  /**
   * Count records
   */
  async count(filter?: FilterCondition): Promise<number> {
    return this.model.count({
      where: this.buildWhere(filter),
    });
  }

  /**
   * Check if any record exists
   */
  async exists(filter?: FilterCondition): Promise<boolean> {
    const count = await this.count(filter);
    return count > 0;
  }
}
