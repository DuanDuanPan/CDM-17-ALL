import { describe, it, expect } from 'vitest';
import type { NodeData, EdgeData, GraphState, ApiResponse } from '../index';
// Story 2.2: Import edge types
import type { EdgeKind, DependencyType, EdgeMetadata, EnhancedEdgeData } from '../edge-types';
import {
  CreateEdgeSchema,
  UpdateEdgeSchema,
  EdgeMetadataSchema,
  isDependencyEdge,
  isHierarchicalEdge,
  createEdgeMetadata,
  DEFAULT_DEPENDENCY_TYPE,
} from '../edge-types';
// Story 2.3: Import task types for multi-view synchronization
import type { TaskProps, TaskStatus } from '../node-types';
import { TaskPropsSchema, NodeType, sanitizeNodeProps } from '../node-types';

describe('Type definitions', () => {
  it('should create a valid NodeData object', () => {
    const node: NodeData = {
      id: 'root-1',
      label: '中心主题',
      type: 'root',
    };
    expect(node.id).toBe('root-1');
    expect(node.label).toBe('中心主题');
    expect(node.type).toBe('root');
  });

  it('should create a valid EdgeData object', () => {
    const edge: EdgeData = {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      type: 'hierarchical',
    };
    expect(edge.id).toBe('edge-1');
    expect(edge.source).toBe('node-1');
    expect(edge.target).toBe('node-2');
  });

  it('should create a valid GraphState object', () => {
    const state: GraphState = {
      nodes: [{ id: '1', label: 'Node 1' }],
      edges: [{ id: 'e1', source: '1', target: '2' }],
    };
    expect(state.nodes).toHaveLength(1);
    expect(state.edges).toHaveLength(1);
  });

  it('should create a valid ApiResponse object', () => {
    const response: ApiResponse<string> = {
      success: true,
      data: 'test',
    };
    expect(response.success).toBe(true);
    expect(response.data).toBe('test');
  });

  // Story 2.2: EdgeData with kind and dependencyType
  it('should create a valid EdgeData with dependency type', () => {
    const edge: EdgeData = {
      id: 'edge-dep-1',
      source: 'task-1',
      target: 'task-2',
      kind: 'dependency',
      dependencyType: 'FS',
    };
    expect(edge.kind).toBe('dependency');
    expect(edge.dependencyType).toBe('FS');
  });
});

// Story 2.2: Edge Types Tests
describe('Edge Types (Story 2.2)', () => {
  describe('EdgeMetadata', () => {
    it('should create valid hierarchical edge metadata', () => {
      const metadata: EdgeMetadata = { kind: 'hierarchical' };
      expect(metadata.kind).toBe('hierarchical');
      expect(metadata.dependencyType).toBeUndefined();
    });

    it('should create valid dependency edge metadata', () => {
      const metadata: EdgeMetadata = { kind: 'dependency', dependencyType: 'FS' };
      expect(metadata.kind).toBe('dependency');
      expect(metadata.dependencyType).toBe('FS');
    });

    it('should support all dependency types', () => {
      const types: DependencyType[] = ['FS', 'SS', 'FF', 'SF'];
      types.forEach((depType) => {
        const metadata: EdgeMetadata = { kind: 'dependency', dependencyType: depType };
        expect(metadata.dependencyType).toBe(depType);
      });
    });
  });

  describe('EnhancedEdgeData', () => {
    it('should create valid EnhancedEdgeData for dependency edge', () => {
      const edge: EnhancedEdgeData = {
        id: 'edge-1',
        source: 'task-a',
        target: 'task-b',
        kind: 'dependency',
        dependencyType: 'SS',
      };
      expect(edge.kind).toBe('dependency');
      expect(edge.dependencyType).toBe('SS');
    });
  });

  describe('Utility Functions', () => {
    it('isDependencyEdge should return true for dependency edges', () => {
      expect(isDependencyEdge({ kind: 'dependency' })).toBe(true);
      expect(isDependencyEdge({ kind: 'hierarchical' })).toBe(false);
    });

    it('isHierarchicalEdge should return true for hierarchical edges', () => {
      expect(isHierarchicalEdge({ kind: 'hierarchical' })).toBe(true);
      expect(isHierarchicalEdge({ kind: undefined })).toBe(true);
      expect(isHierarchicalEdge({ kind: 'dependency' })).toBe(false);
    });

    it('createEdgeMetadata should create correct metadata', () => {
      const hierarchical = createEdgeMetadata('hierarchical');
      expect(hierarchical.kind).toBe('hierarchical');
      expect(hierarchical.dependencyType).toBeUndefined();

      const dependency = createEdgeMetadata('dependency', 'FF');
      expect(dependency.kind).toBe('dependency');
      expect(dependency.dependencyType).toBe('FF');

      // Default dependency type
      const defaultDep = createEdgeMetadata('dependency');
      expect(defaultDep.dependencyType).toBe(DEFAULT_DEPENDENCY_TYPE);
    });
  });

  describe('Zod Schemas', () => {
    describe('EdgeMetadataSchema', () => {
      it('should validate hierarchical edge metadata', () => {
        const result = EdgeMetadataSchema.safeParse({ kind: 'hierarchical' });
        expect(result.success).toBe(true);
      });

      it('should validate dependency edge metadata with dependencyType', () => {
        const result = EdgeMetadataSchema.safeParse({ kind: 'dependency', dependencyType: 'FS' });
        expect(result.success).toBe(true);
      });

      it('should reject dependency edge metadata without dependencyType', () => {
        const result = EdgeMetadataSchema.safeParse({ kind: 'dependency' });
        expect(result.success).toBe(false);
      });

      it('should reject invalid kind', () => {
        const result = EdgeMetadataSchema.safeParse({ kind: 'invalid' });
        expect(result.success).toBe(false);
      });
    });

    describe('CreateEdgeSchema', () => {
      it('should validate hierarchical edge creation', () => {
        const result = CreateEdgeSchema.safeParse({
          graphId: 'graph-1',
          sourceId: 'node-1',
          targetId: 'node-2',
          kind: 'hierarchical',
        });
        expect(result.success).toBe(true);
      });

      it('should validate dependency edge creation with dependencyType', () => {
        const result = CreateEdgeSchema.safeParse({
          graphId: 'graph-1',
          sourceId: 'task-1',
          targetId: 'task-2',
          kind: 'dependency',
          dependencyType: 'FS',
        });
        expect(result.success).toBe(true);
      });

      it('should reject dependency edge without dependencyType', () => {
        const result = CreateEdgeSchema.safeParse({
          graphId: 'graph-1',
          sourceId: 'task-1',
          targetId: 'task-2',
          kind: 'dependency',
        });
        expect(result.success).toBe(false);
      });

      it('should reject hierarchical edge with dependencyType', () => {
        const result = CreateEdgeSchema.safeParse({
          graphId: 'graph-1',
          sourceId: 'node-1',
          targetId: 'node-2',
          kind: 'hierarchical',
          dependencyType: 'FS',
        });
        expect(result.success).toBe(false);
      });

      it('should default to hierarchical when kind is not specified', () => {
        const result = CreateEdgeSchema.safeParse({
          graphId: 'graph-1',
          sourceId: 'node-1',
          targetId: 'node-2',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.kind).toBe('hierarchical');
        }
      });
    });

    describe('UpdateEdgeSchema', () => {
      it('should validate changing dependencyType', () => {
        const result = UpdateEdgeSchema.safeParse({
          dependencyType: 'SS',
        });
        expect(result.success).toBe(true);
      });

      it('should reject changing to dependency without dependencyType', () => {
        const result = UpdateEdgeSchema.safeParse({
          kind: 'dependency',
        });
        expect(result.success).toBe(false);
      });

      it('should validate changing kind to dependency with dependencyType', () => {
        const result = UpdateEdgeSchema.safeParse({
          kind: 'dependency',
          dependencyType: 'FF',
        });
        expect(result.success).toBe(true);
      });
    });
  });
});

describe('sanitizeNodeProps', () => {
  it('filters DATA props to allowed keys', () => {
    const raw = {
      dataType: 'document',
      version: 'v1.0.1',
      secretLevel: 'internal',
      storagePath: '/tmp/file',
      code: 'PBS-001',
      ownerId: 'user-1',
      status: 'todo',
    };
    const sanitized = sanitizeNodeProps(NodeType.DATA, raw);
    expect(sanitized).toEqual({
      dataType: 'document',
      version: 'v1.0.1',
      secretLevel: 'internal',
      storagePath: '/tmp/file',
    });
  });

  it('filters PBS props to allowed keys', () => {
    const raw = {
      code: 'PBS-001',
      version: 'v1.0.0',
      ownerId: 'owner-1',
      indicators: [{ id: 'i1', name: 'Mass', targetValue: '10' }],
      productRef: { productId: 'p1', productName: 'Engine' },
      dataType: 'document',
    };
    const sanitized = sanitizeNodeProps(NodeType.PBS, raw);
    expect(sanitized).toEqual({
      code: 'PBS-001',
      version: 'v1.0.0',
      ownerId: 'owner-1',
      indicators: [{ id: 'i1', name: 'Mass', targetValue: '10' }],
      productRef: { productId: 'p1', productName: 'Engine' },
    });
  });

  it('returns empty object for ORDINARY nodes', () => {
    const sanitized = sanitizeNodeProps(NodeType.ORDINARY, { any: 'value' });
    expect(sanitized).toEqual({});
  });
});

// Story 2.3: Task Types Tests for Multi-View Synchronization
describe('Task Types (Story 2.3)', () => {
  describe('TaskProps Interface', () => {
    it('should create valid TaskProps with all fields', () => {
      const taskProps: TaskProps = {
        status: 'in-progress',
        assigneeId: 'user-1',
        startDate: '2025-01-01T00:00:00Z',
        dueDate: '2025-01-15T00:00:00Z',
        priority: 'high',
        customStage: 'Development',
        progress: 50,
      };
      expect(taskProps.status).toBe('in-progress');
      expect(taskProps.startDate).toBe('2025-01-01T00:00:00Z');
      expect(taskProps.dueDate).toBe('2025-01-15T00:00:00Z');
      expect(taskProps.customStage).toBe('Development');
      expect(taskProps.progress).toBe(50);
    });

    it('should allow partial TaskProps for optional fields', () => {
      const taskProps: TaskProps = {
        status: 'todo',
      };
      expect(taskProps.status).toBe('todo');
      expect(taskProps.startDate).toBeUndefined();
      expect(taskProps.customStage).toBeUndefined();
    });

    it('should allow null values for nullable fields', () => {
      const taskProps: TaskProps = {
        status: 'done',
        startDate: null,
        dueDate: null,
        customStage: null,
        progress: null,
      };
      expect(taskProps.startDate).toBeNull();
      expect(taskProps.customStage).toBeNull();
    });
  });

  describe('TaskStatus Type', () => {
    it('should only allow valid status values', () => {
      const validStatuses: TaskStatus[] = ['todo', 'in-progress', 'done'];
      validStatuses.forEach((status) => {
        const props: TaskProps = { status };
        expect(props.status).toBe(status);
      });
    });
  });

  describe('TaskPropsSchema Validation', () => {
    it('should validate complete TaskProps', () => {
      const result = TaskPropsSchema.safeParse({
        status: 'in-progress',
        assigneeId: 'user-1',
        startDate: '2025-01-01T00:00:00Z',
        dueDate: '2025-01-15T00:00:00Z',
        priority: 'high',
        customStage: 'Development',
        progress: 75,
      });
      expect(result.success).toBe(true);
    });

    it('should validate TaskProps with only startDate (Gantt use case)', () => {
      const result = TaskPropsSchema.safeParse({
        startDate: '2025-01-01T00:00:00Z',
        dueDate: '2025-01-15T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('should validate TaskProps with customStage (Kanban use case)', () => {
      const result = TaskPropsSchema.safeParse({
        status: 'todo',
        customStage: 'Design',
      });
      expect(result.success).toBe(true);
    });

    it('should validate TaskProps with progress (Gantt progress bar)', () => {
      const result = TaskPropsSchema.safeParse({
        progress: 50,
      });
      expect(result.success).toBe(true);
    });

    it('should reject progress outside 0-100 range', () => {
      const result1 = TaskPropsSchema.safeParse({
        progress: -1,
      });
      expect(result1.success).toBe(false);

      const result2 = TaskPropsSchema.safeParse({
        progress: 101,
      });
      expect(result2.success).toBe(false);
    });

    it('should accept progress at boundary values', () => {
      const result0 = TaskPropsSchema.safeParse({ progress: 0 });
      expect(result0.success).toBe(true);

      const result100 = TaskPropsSchema.safeParse({ progress: 100 });
      expect(result100.success).toBe(true);
    });

    it('should validate null values for nullable fields', () => {
      const result = TaskPropsSchema.safeParse({
        startDate: null,
        dueDate: null,
        customStage: null,
        progress: null,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status values', () => {
      const result = TaskPropsSchema.safeParse({
        status: 'invalid-status',
      });
      expect(result.success).toBe(false);
    });

    it('should reject extra fields (strict mode)', () => {
      const result = TaskPropsSchema.safeParse({
        status: 'todo',
        unknownField: 'value',
      });
      expect(result.success).toBe(false);
    });
  });
});
