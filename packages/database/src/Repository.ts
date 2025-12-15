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
} from './types';

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
  protected get model(): any {
    return (this.prisma as any)[this.modelName];
  }

  /**
   * Convert filter to Prisma where clause
   */
  protected buildWhere(filter?: FilterCondition): any {
    if (!filter) return undefined;

    const where: any = {};

    for (const [key, value] of Object.entries(filter)) {
      if (key === '$and') {
        where.AND = (value as FilterCondition[]).map((f) => this.buildWhere(f));
      } else if (key === '$or') {
        where.OR = (value as FilterCondition[]).map((f) => this.buildWhere(f));
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Handle operators
        const ops = value as Record<string, any>;
        const prismaOps: any = {};

        if ('$eq' in ops) prismaOps.equals = ops.$eq;
        if ('$ne' in ops) prismaOps.not = ops.$ne;
        if ('$gt' in ops) prismaOps.gt = ops.$gt;
        if ('$gte' in ops) prismaOps.gte = ops.$gte;
        if ('$lt' in ops) prismaOps.lt = ops.$lt;
        if ('$lte' in ops) prismaOps.lte = ops.$lte;
        if ('$in' in ops) prismaOps.in = ops.$in;
        if ('$notIn' in ops) prismaOps.notIn = ops.$notIn;
        if ('$like' in ops) prismaOps.contains = ops.$like.replace(/%/g, '');
        if ('$iLike' in ops) {
          prismaOps.contains = ops.$iLike.replace(/%/g, '');
          prismaOps.mode = 'insensitive';
        }
        if ('$isNull' in ops) {
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
  protected buildOrderBy(sort?: string[]): any {
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
  protected buildSelect(fields?: string[]): any {
    if (!fields || fields.length === 0) return undefined;

    const select: any = {};
    for (const field of fields) {
      select[field] = true;
    }
    return select;
  }

  /**
   * Convert appends array to Prisma include
   */
  protected buildInclude(appends?: string[]): any {
    if (!appends || appends.length === 0) return undefined;

    const include: any = {};
    for (const relation of appends) {
      // Support nested relations like 'creator.profile'
      const parts = relation.split('.');
      let current = include;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          current[part] = true;
        } else {
          current[part] = current[part] || { include: {} };
          current = current[part].include;
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

    const query: any = {
      where: this.buildWhere(filter),
      orderBy: this.buildOrderBy(sort),
    };

    // Handle select/include (mutually exclusive in Prisma)
    if (fields && fields.length > 0) {
      query.select = this.buildSelect(fields);
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

    const query: any = {};

    if (filterByTk !== undefined) {
      query.where = { id: filterByTk };
    } else if (filter) {
      query.where = this.buildWhere(filter);
    }

    // Handle select/include
    if (fields && fields.length > 0) {
      query.select = this.buildSelect(fields);
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
  async createMany(records: Record<string, any>[]): Promise<{ count: number }> {
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
