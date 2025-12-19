/**
 * Story 2.2: Edge Filtering Utilities Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getEdgeMetadata,
  isHierarchicalEdge,
  isDependencyEdge,
  filterHierarchicalEdges,
  filterDependencyEdges,
} from '../edgeFilters';

// Mock Edge class
function createMockEdge(data: Record<string, unknown> = {}) {
  return {
    getData: vi.fn(() => data),
    getProp: vi.fn((key: string) => data[key]),
    getSourceCellId: vi.fn(() => 'source-id'),
    getTargetCellId: vi.fn(() => 'target-id'),
  } as any;
}

describe('Edge Filtering Utilities (Story 2.2)', () => {
  describe('getEdgeMetadata', () => {
    it('should return metadata from data.metadata', () => {
      const edge = createMockEdge({
        metadata: { kind: 'dependency', dependencyType: 'FS' },
      });

      const metadata = getEdgeMetadata(edge);

      expect(metadata.kind).toBe('dependency');
      expect(metadata.dependencyType).toBe('FS');
    });

    it('should return metadata from data.kind (alternative location)', () => {
      const edge = createMockEdge({
        kind: 'dependency',
        dependencyType: 'SS',
      });

      const metadata = getEdgeMetadata(edge);

      expect(metadata.kind).toBe('dependency');
      expect(metadata.dependencyType).toBe('SS');
    });

    it('should default to hierarchical for edges without metadata', () => {
      const edge = createMockEdge({});

      const metadata = getEdgeMetadata(edge);

      expect(metadata.kind).toBe('hierarchical');
    });

    it('should default to hierarchical for legacy edges', () => {
      const edge = createMockEdge({ type: 'hierarchical' }); // Legacy field

      const metadata = getEdgeMetadata(edge);

      expect(metadata.kind).toBe('hierarchical');
    });
  });

  describe('isHierarchicalEdge', () => {
    it('should return true for hierarchical edges', () => {
      const edge = createMockEdge({
        metadata: { kind: 'hierarchical' },
      });

      expect(isHierarchicalEdge(edge)).toBe(true);
    });

    it('should return true for edges without kind (default)', () => {
      const edge = createMockEdge({});

      expect(isHierarchicalEdge(edge)).toBe(true);
    });

    it('should return false for dependency edges', () => {
      const edge = createMockEdge({
        metadata: { kind: 'dependency', dependencyType: 'FS' },
      });

      expect(isHierarchicalEdge(edge)).toBe(false);
    });
  });

  describe('isDependencyEdge', () => {
    it('should return true for dependency edges', () => {
      const edge = createMockEdge({
        metadata: { kind: 'dependency', dependencyType: 'FS' },
      });

      expect(isDependencyEdge(edge)).toBe(true);
    });

    it('should return false for hierarchical edges', () => {
      const edge = createMockEdge({
        metadata: { kind: 'hierarchical' },
      });

      expect(isDependencyEdge(edge)).toBe(false);
    });

    it('should return false for edges without kind (default to hierarchical)', () => {
      const edge = createMockEdge({});

      expect(isDependencyEdge(edge)).toBe(false);
    });
  });

  describe('filterHierarchicalEdges', () => {
    it('should filter out dependency edges', () => {
      const edges = [
        createMockEdge({ metadata: { kind: 'hierarchical' } }),
        createMockEdge({ metadata: { kind: 'dependency', dependencyType: 'FS' } }),
        createMockEdge({ metadata: { kind: 'hierarchical' } }),
        createMockEdge({ metadata: { kind: 'dependency', dependencyType: 'SS' } }),
      ];

      const result = filterHierarchicalEdges(edges);

      expect(result).toHaveLength(2);
      result.forEach((edge) => {
        expect(isHierarchicalEdge(edge)).toBe(true);
      });
    });

    it('should return empty array for null input', () => {
      expect(filterHierarchicalEdges(null)).toEqual([]);
    });

    it('should return empty array for undefined input', () => {
      expect(filterHierarchicalEdges(undefined)).toEqual([]);
    });

    it('should return empty array for empty input', () => {
      expect(filterHierarchicalEdges([])).toEqual([]);
    });

    it('should include legacy edges (default to hierarchical)', () => {
      const edges = [
        createMockEdge({}), // No metadata - should be hierarchical
        createMockEdge({ metadata: { kind: 'dependency', dependencyType: 'FS' } }),
      ];

      const result = filterHierarchicalEdges(edges);

      expect(result).toHaveLength(1);
    });
  });

  describe('filterDependencyEdges', () => {
    it('should filter out hierarchical edges', () => {
      const edges = [
        createMockEdge({ metadata: { kind: 'hierarchical' } }),
        createMockEdge({ metadata: { kind: 'dependency', dependencyType: 'FS' } }),
        createMockEdge({ metadata: { kind: 'hierarchical' } }),
        createMockEdge({ metadata: { kind: 'dependency', dependencyType: 'SS' } }),
      ];

      const result = filterDependencyEdges(edges);

      expect(result).toHaveLength(2);
      result.forEach((edge) => {
        expect(isDependencyEdge(edge)).toBe(true);
      });
    });

    it('should return empty array for null input', () => {
      expect(filterDependencyEdges(null)).toEqual([]);
    });

    it('should return empty array when no dependency edges exist', () => {
      const edges = [
        createMockEdge({ metadata: { kind: 'hierarchical' } }),
        createMockEdge({}), // Default hierarchical
      ];

      const result = filterDependencyEdges(edges);

      expect(result).toHaveLength(0);
    });
  });

  describe('Tree Navigation Safety (TC-2.2-3)', () => {
    it('should only return hierarchical edges for tree traversal', () => {
      // Scenario: Node A has both a hierarchical child and a dependency target
      // Tree navigation should only follow the hierarchical edge

      const hierarchicalEdge = createMockEdge({
        metadata: { kind: 'hierarchical' },
      });
      const dependencyEdge = createMockEdge({
        metadata: { kind: 'dependency', dependencyType: 'FS' },
      });

      const allOutgoingEdges = [hierarchicalEdge, dependencyEdge];
      const hierarchicalOnly = filterHierarchicalEdges(allOutgoingEdges);

      expect(hierarchicalOnly).toHaveLength(1);
      expect(hierarchicalOnly[0]).toBe(hierarchicalEdge);
    });
  });
});
