import { describe, it, expect } from 'vitest';
import type { NodeData, EdgeData, GraphState, ApiResponse } from '../index';

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
});
