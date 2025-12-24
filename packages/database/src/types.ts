/**
 * Database Layer Types
 *
 * NocoBase-inspired three-layer data abstraction types.
 */

/**
 * Field type definitions for Collection
 */
export type FieldType =
  | 'string'
  | 'text'
  | 'integer'
  | 'bigInt'
  | 'float'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'uuid'
  | 'belongsTo'
  | 'hasOne'
  | 'hasMany'
  | 'belongsToMany';

/**
 * Field definition
 */
export interface FieldDefinition {
  /** Field type */
  type: FieldType;
  /** Field name */
  name: string;
  /** Whether field is required */
  required?: boolean;
  /** Whether field is unique */
  unique?: boolean;
  /** Default value */
  default?: unknown;
  /** For relations: target collection name */
  target?: string;
  /** For belongsToMany: through table name */
  through?: string;
  /** Foreign key name */
  foreignKey?: string;
  /** Additional field options */
  options?: Record<string, unknown>;
}

/**
 * Index definition
 */
export interface IndexDefinition {
  /** Fields to index */
  fields: string[];
  /** Whether index is unique */
  unique?: boolean;
  /** Index name */
  name?: string;
}

/**
 * Collection definition
 */
export interface CollectionDefinition {
  /** Collection name (table name) */
  name: string;
  /** Field definitions */
  fields: FieldDefinition[];
  /** Index definitions */
  indexes?: IndexDefinition[];
  /** Whether to enable timestamps (createdAt, updatedAt) */
  timestamps?: boolean;
  /** Whether to enable soft delete (deletedAt) */
  softDelete?: boolean;
  /** Collection description */
  description?: string;
}

/**
 * Filter operators
 */
export interface FilterOperators<T = unknown> {
  $eq?: T;
  $ne?: T;
  $gt?: T;
  $gte?: T;
  $lt?: T;
  $lte?: T;
  $in?: T[];
  $notIn?: T[];
  $like?: string;
  $notLike?: string;
  $iLike?: string;
  $notILike?: string;
  $between?: [T, T];
  $notBetween?: [T, T];
  $isNull?: boolean;
  $and?: FilterCondition[];
  $or?: FilterCondition[];
}

/**
 * Filter condition type
 */
export type FilterCondition = {
  [key: string]: unknown | FilterOperators;
};

/**
 * Query options for find operations
 */
export interface FindOptions {
  /** Filter conditions */
  filter?: FilterCondition;
  /** Fields to return */
  fields?: string[];
  /** Relations to include */
  appends?: string[];
  /** Sort order (prefix with - for descending) */
  sort?: string[];
  /** Page number (1-indexed) */
  page?: number;
  /** Page size */
  pageSize?: number;
  /** Skip count (alternative to page) */
  offset?: number;
  /** Limit count (alternative to pageSize) */
  limit?: number;
}

/**
 * Query options for findOne
 */
export interface FindOneOptions {
  /** Filter conditions */
  filter?: FilterCondition;
  /** Find by primary key */
  filterByTk?: string | number;
  /** Fields to return */
  fields?: string[];
  /** Relations to include */
  appends?: string[];
}

/**
 * Options for create operations
 */
export interface CreateOptions {
  /** Values to create */
  values: Record<string, unknown>;
}

/**
 * Options for update operations
 */
export interface UpdateOptions {
  /** Filter conditions */
  filter?: FilterCondition;
  /** Update by primary key */
  filterByTk?: string | number;
  /** Values to update */
  values: Record<string, unknown>;
}

/**
 * Options for destroy operations
 */
export interface DestroyOptions {
  /** Filter conditions */
  filter?: FilterCondition;
  /** Destroy by primary key */
  filterByTk?: string | number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  /** Result data */
  data: T[];
  /** Total count */
  total: number;
  /** Current page */
  page: number;
  /** Page size */
  pageSize: number;
  /** Total pages */
  totalPages: number;
}

/**
 * Database event types
 */
export type DatabaseEventType =
  | 'beforeCreate'
  | 'afterCreate'
  | 'beforeUpdate'
  | 'afterUpdate'
  | 'beforeDestroy'
  | 'afterDestroy'
  | 'beforeFind'
  | 'afterFind';

/**
 * Database event handler
 */
export type DatabaseEventHandler<T = unknown> = (
  model: T,
  options?: Record<string, unknown>
) => Promise<void> | void;
