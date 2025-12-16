import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Graph } from '@antv/x6';
import { LayoutManager } from '../LayoutManager';
import { LayoutMode } from '@cdm/types';

// Mock X6 Graph
vi.mock('@antv/x6', () => ({
  Graph: vi.fn(),
}));

describe('LayoutManager', () => {
  let mockGraph: any;
  let layoutManager: LayoutManager;

  beforeEach(() => {
    // Create mock graph with necessary methods
    mockGraph = {
      getNodes: vi.fn().mockReturnValue([]),
      getCellById: vi.fn(),
      drawGrid: vi.fn(),
      clearGrid: vi.fn(),
      getOutgoingEdges: vi.fn().mockReturnValue([]),
      on: vi.fn(),
      off: vi.fn(),
      model: {
        startBatch: vi.fn(),
        stopBatch: vi.fn(),
      },
      options: {
        interacting: {},
        snapline: {
          enabled: false,
        },
      },
    };

    layoutManager = new LayoutManager(mockGraph as unknown as Graph);
  });

  describe('applyLayout', () => {
    it('should switch to mindmap mode', async () => {
      await layoutManager.applyLayout('mindmap' as LayoutMode, false);
      expect(layoutManager.getCurrentMode()).toBe('mindmap');
    });

    it('should switch to logic mode', async () => {
      await layoutManager.applyLayout('logic' as LayoutMode, false);
      expect(layoutManager.getCurrentMode()).toBe('logic');
    });

    it('should switch to free mode and enable grid', async () => {
      await layoutManager.applyLayout('free' as LayoutMode, false);
      expect(layoutManager.getCurrentMode()).toBe('free');
      expect(mockGraph.drawGrid).toHaveBeenCalled();
    });

    it('should disable grid when switching from free mode', async () => {
      await layoutManager.applyLayout('free' as LayoutMode, false);
      await layoutManager.applyLayout('mindmap' as LayoutMode, false);
      expect(mockGraph.clearGrid).toHaveBeenCalled();
    });
  });

  describe('recalculate', () => {
    it('should not recalculate in free mode', async () => {
      await layoutManager.applyLayout('free' as LayoutMode, false);
      const getNodesSpy = vi.spyOn(mockGraph, 'getNodes');
      await layoutManager.recalculate(false);
      // In free mode, layout should not recalculate
      expect(getNodesSpy).not.toHaveBeenCalled();
    });

    it('should recalculate in mindmap mode', async () => {
      mockGraph.getNodes.mockReturnValue([
        {
          id: 'root',
          getData: () => ({ type: 'root' }),
          isNode: () => true,
          getAttrs: () => ({ body: {} }),
          setAttrs: vi.fn(),
          setProp: vi.fn(),
          removeProp: vi.fn(),
          prop: vi.fn(),
        },
      ]);

      await layoutManager.applyLayout('mindmap' as LayoutMode, false);
      await layoutManager.recalculate(false);
      // Should attempt to get nodes for layout calculation
      expect(mockGraph.getNodes).toHaveBeenCalled();
    });
  });

  describe('getCurrentMode', () => {
    it('should return current layout mode', () => {
      expect(layoutManager.getCurrentMode()).toBe('mindmap');
    });

    it('should update after mode change', async () => {
      await layoutManager.applyLayout('logic' as LayoutMode, false);
      expect(layoutManager.getCurrentMode()).toBe('logic');
    });
  });
});
