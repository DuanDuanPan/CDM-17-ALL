/**
 * Story 2.2: Edge Validation Utilities Unit Tests
 * Tests for dependency edge validation and cycle detection
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- Test mocks commonly use any */
import { describe, expect, it } from 'vitest';
import { NodeType } from '@cdm/types';
import {
  isTaskNode,
  getEdgeMetadata,
  isDependencyEdge,
  validateDependencyEdge,
  detectCycleIfCreated,
  createEdgeValidator,
} from '@/lib/edgeValidation';

// Mock Node class
const createMockNode = (id: string, nodeType: NodeType, label?: string) => ({
  id,
  getData: () => ({ nodeType, label: label || `Node ${id}` }),
  isNode: () => true,
});

// Mock Edge class
const createMockEdge = (
  id: string,
  sourceId: string,
  targetId: string,
  kind: 'hierarchical' | 'dependency' = 'hierarchical',
  dependencyType?: string
) => ({
  id,
  getData: () => ({
    kind,
    dependencyType,
    metadata: { kind, dependencyType },
  }),
  getSourceCellId: () => sourceId,
  getTargetCellId: () => targetId,
});

// Mock Graph class
const createMockGraph = (nodes: ReturnType<typeof createMockNode>[], edges: ReturnType<typeof createMockEdge>[]) => ({
  getCellById: (id: string) => nodes.find((n) => n.id === id) || null,
  getEdges: () => edges,
});

describe('edgeValidation', () => {
  describe('isTaskNode', () => {
    it('should return true for TASK node type', () => {
      const taskNode = createMockNode('1', NodeType.TASK);
      expect(isTaskNode(taskNode as any)).toBe(true);
    });

    it('should return false for PBS node type', () => {
      const pbsNode = createMockNode('1', NodeType.PBS);
      expect(isTaskNode(pbsNode as any)).toBe(false);
    });

    it('should return false for REQUIREMENT node type', () => {
      const reqNode = createMockNode('1', NodeType.REQUIREMENT);
      expect(isTaskNode(reqNode as any)).toBe(false);
    });

    it('should return false for DATA node type', () => {
      const dataNode = createMockNode('1', NodeType.DATA);
      expect(isTaskNode(dataNode as any)).toBe(false);
    });

    it('should return false for node with no nodeType', () => {
      const node = { getData: () => ({}) };
      expect(isTaskNode(node as any)).toBe(false);
    });
  });

  describe('getEdgeMetadata', () => {
    it('should extract metadata from metadata object', () => {
      const edge = createMockEdge('e1', 'a', 'b', 'dependency', 'FS');
      const metadata = getEdgeMetadata(edge as any);

      expect(metadata.kind).toBe('dependency');
      expect(metadata.dependencyType).toBe('FS');
    });

    it('should extract kind directly from data if no metadata object', () => {
      const edge = {
        getData: () => ({ kind: 'dependency', dependencyType: 'SS' }),
      };
      const metadata = getEdgeMetadata(edge as any);

      expect(metadata.kind).toBe('dependency');
      expect(metadata.dependencyType).toBe('SS');
    });

    it('should default to hierarchical if no kind specified', () => {
      const edge = { getData: () => ({}) };
      const metadata = getEdgeMetadata(edge as any);

      expect(metadata.kind).toBe('hierarchical');
    });
  });

  describe('isDependencyEdge', () => {
    it('should return true for dependency edge', () => {
      const edge = createMockEdge('e1', 'a', 'b', 'dependency', 'FS');
      expect(isDependencyEdge(edge as any)).toBe(true);
    });

    it('should return false for hierarchical edge', () => {
      const edge = createMockEdge('e1', 'a', 'b', 'hierarchical');
      expect(isDependencyEdge(edge as any)).toBe(false);
    });
  });

  describe('validateDependencyEdge', () => {
    it('should reject self-loops', () => {
      const nodes = [createMockNode('a', NodeType.TASK)];
      const graph = createMockGraph(nodes, []);

      const result = validateDependencyEdge(graph as any, 'a', 'a');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('自循环');
    });

    it('should reject when source node does not exist', () => {
      const nodes = [createMockNode('b', NodeType.TASK)];
      const graph = createMockGraph(nodes, []);

      const result = validateDependencyEdge(graph as any, 'a', 'b');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('不存在');
    });

    it('should reject when target node does not exist', () => {
      const nodes = [createMockNode('a', NodeType.TASK)];
      const graph = createMockGraph(nodes, []);

      const result = validateDependencyEdge(graph as any, 'a', 'b');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('不存在');
    });

    it('should reject when source is not a TASK node', () => {
      const nodes = [
        createMockNode('a', NodeType.PBS),
        createMockNode('b', NodeType.TASK),
      ];
      const graph = createMockGraph(nodes, []);

      const result = validateDependencyEdge(graph as any, 'a', 'b');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('任务节点');
    });

    it('should reject when target is not a TASK node', () => {
      const nodes = [
        createMockNode('a', NodeType.TASK),
        createMockNode('b', NodeType.REQUIREMENT),
      ];
      const graph = createMockGraph(nodes, []);

      const result = validateDependencyEdge(graph as any, 'a', 'b');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('任务节点');
    });

    it('should accept valid dependency between TASK nodes', () => {
      const nodes = [
        createMockNode('a', NodeType.TASK),
        createMockNode('b', NodeType.TASK),
      ];
      const graph = createMockGraph(nodes, []);

      const result = validateDependencyEdge(graph as any, 'a', 'b');

      expect(result.isValid).toBe(true);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should reject when creating edge would form a cycle', () => {
      const nodes = [
        createMockNode('a', NodeType.TASK, 'Task A'),
        createMockNode('b', NodeType.TASK, 'Task B'),
      ];
      // Existing edge: a -> b (dependency)
      const edges = [createMockEdge('e1', 'a', 'b', 'dependency', 'FS')];
      const graph = createMockGraph(nodes, edges);

      // Try to create b -> a, which would form a cycle
      const result = validateDependencyEdge(graph as any, 'b', 'a');

      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toContain('循环依赖');
    });
  });

  describe('detectCycleIfCreated', () => {
    it('should detect self-loop as a cycle', () => {
      const graph = createMockGraph([], []);
      const result = detectCycleIfCreated(graph as any, 'a', 'a');

      expect(result.hasCycle).toBe(true);
      expect(result.cyclePath).toEqual(['a', 'a']);
    });

    it('should detect simple A->B->A cycle', () => {
      const nodes = [
        createMockNode('a', NodeType.TASK),
        createMockNode('b', NodeType.TASK),
      ];
      // Existing: a -> b
      const edges = [createMockEdge('e1', 'a', 'b', 'dependency')];
      const graph = createMockGraph(nodes, edges);

      // Try to add b -> a
      const result = detectCycleIfCreated(graph as any, 'b', 'a');

      expect(result.hasCycle).toBe(true);
      expect(result.cyclePath).toBeDefined();
    });

    it('should detect A->B->C->A cycle', () => {
      const nodes = [
        createMockNode('a', NodeType.TASK),
        createMockNode('b', NodeType.TASK),
        createMockNode('c', NodeType.TASK),
      ];
      // Existing: a -> b -> c
      const edges = [
        createMockEdge('e1', 'a', 'b', 'dependency'),
        createMockEdge('e2', 'b', 'c', 'dependency'),
      ];
      const graph = createMockGraph(nodes, edges);

      // Try to add c -> a
      const result = detectCycleIfCreated(graph as any, 'c', 'a');

      expect(result.hasCycle).toBe(true);
    });

    it('should NOT detect cycle for valid DAG', () => {
      const nodes = [
        createMockNode('a', NodeType.TASK),
        createMockNode('b', NodeType.TASK),
        createMockNode('c', NodeType.TASK),
      ];
      // Existing: a -> b, a -> c
      const edges = [
        createMockEdge('e1', 'a', 'b', 'dependency'),
        createMockEdge('e2', 'a', 'c', 'dependency'),
      ];
      const graph = createMockGraph(nodes, edges);

      // Adding b -> c is valid (no cycle)
      const result = detectCycleIfCreated(graph as any, 'b', 'c');

      expect(result.hasCycle).toBe(false);
    });

    it('should ignore hierarchical edges when detecting cycles', () => {
      const nodes = [
        createMockNode('a', NodeType.TASK),
        createMockNode('b', NodeType.TASK),
      ];
      // Existing: a -> b (hierarchical, NOT dependency)
      const edges = [createMockEdge('e1', 'a', 'b', 'hierarchical')];
      const graph = createMockGraph(nodes, edges);

      // Adding b -> a should NOT be detected as cycle
      // because hierarchical edges are ignored
      const result = detectCycleIfCreated(graph as any, 'b', 'a');

      expect(result.hasCycle).toBe(false);
    });
  });

  describe('createEdgeValidator', () => {
    it('should allow all edges when not in dependency mode', () => {
      const validator = createEdgeValidator(false);

      const result = validator({
        sourceCell: { id: 'a' },
        targetCell: { id: 'b' },
      });

      expect(result).toBe(true);
    });

    it('should reject self-loops in dependency mode', () => {
      const validator = createEdgeValidator(true);

      const result = validator({
        sourceCell: { id: 'a' },
        targetCell: { id: 'a' },
      });

      expect(result).toBe(false);
    });

    it('should reject missing source cell in dependency mode', () => {
      const validator = createEdgeValidator(true);

      const result = validator({
        sourceCell: null,
        targetCell: { id: 'b' },
      });

      expect(result).toBe(false);
    });

    it('should reject missing target cell in dependency mode', () => {
      const validator = createEdgeValidator(true);

      const result = validator({
        sourceCell: { id: 'a' },
        targetCell: null,
      });

      expect(result).toBe(false);
    });

    it('should allow valid connection in dependency mode', () => {
      const validator = createEdgeValidator(true);

      const result = validator({
        sourceCell: { id: 'a' },
        targetCell: { id: 'b' },
      });

      expect(result).toBe(true);
    });
  });
});
