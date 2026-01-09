/**
 * Story 8.8: Semantic Zoom LOD
 * Unit tests for LOD threshold function and global store
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLODLevel,
  setGraphScale,
  getCurrentLOD,
  subscribe,
  resetLODStore,
  type LODLevel,
} from '../../lib/semanticZoomLOD';

describe('semanticZoomLOD', () => {
  beforeEach(() => {
    resetLODStore();
  });

  describe('getLODLevel (threshold function)', () => {
    // AC1: 缩放到 < 50% 时进入 compact
    it('should return "full" for scale >= 0.5', () => {
      expect(getLODLevel(1.0)).toBe('full');
      expect(getLODLevel(0.6)).toBe('full');
      expect(getLODLevel(0.5)).toBe('full'); // Boundary: 0.5 is full
    });

    it('should return "compact" for 0.25 <= scale < 0.5', () => {
      expect(getLODLevel(0.499)).toBe('compact'); // Just below 0.5
      expect(getLODLevel(0.4)).toBe('compact');
      expect(getLODLevel(0.3)).toBe('compact');
      expect(getLODLevel(0.25)).toBe('compact'); // Boundary: 0.25 is compact
    });

    // AC2: 缩放到 < 25% 时进入 micro
    it('should return "micro" for scale < 0.25', () => {
      expect(getLODLevel(0.249)).toBe('micro'); // Just below 0.25
      expect(getLODLevel(0.2)).toBe('micro');
      expect(getLODLevel(0.1)).toBe('micro');
      expect(getLODLevel(0.05)).toBe('micro');
    });

    // Edge cases
    it('should handle extreme values', () => {
      expect(getLODLevel(2.0)).toBe('full'); // > 100% zoom
      expect(getLODLevel(0.01)).toBe('micro'); // Very small
      expect(getLODLevel(0)).toBe('micro'); // Zero
    });
  });

  describe('LOD Store State Management', () => {
    it('should initialize with "full" level', () => {
      expect(getCurrentLOD()).toBe('full');
    });

    // AC4: 性能护栏 - 仅在 LODLevel 变化时 notify
    it('should only notify subscribers when LOD level changes', () => {
      const listener = vi.fn();
      const unsubscribe = subscribe(listener);

      // Same level - no notification
      setGraphScale(0.8); // full
      expect(listener).toHaveBeenCalledTimes(0);

      setGraphScale(0.6); // still full
      expect(listener).toHaveBeenCalledTimes(0);

      // Different level - should notify
      setGraphScale(0.4); // compact
      expect(listener).toHaveBeenCalledTimes(1);

      // Same level - no notification
      setGraphScale(0.3); // still compact
      expect(listener).toHaveBeenCalledTimes(1);

      // Different level - should notify
      setGraphScale(0.2); // micro
      expect(listener).toHaveBeenCalledTimes(2);

      unsubscribe();
    });

    // AC1 + AC3: full → compact 变化
    it('should transition from full to compact correctly', () => {
      setGraphScale(0.6); // full
      expect(getCurrentLOD()).toBe('full');

      setGraphScale(0.4); // compact
      expect(getCurrentLOD()).toBe('compact');
    });

    // AC2: compact → micro 变化
    it('should transition from compact to micro correctly', () => {
      setGraphScale(0.4); // compact
      expect(getCurrentLOD()).toBe('compact');

      setGraphScale(0.2); // micro
      expect(getCurrentLOD()).toBe('micro');
    });

    // AC3: micro → compact → full 恢复
    it('should restore from micro to compact to full correctly', () => {
      // Start at micro
      setGraphScale(0.1);
      expect(getCurrentLOD()).toBe('micro');

      // Zoom in to compact
      setGraphScale(0.3);
      expect(getCurrentLOD()).toBe('compact');

      // Zoom in to full
      setGraphScale(0.6);
      expect(getCurrentLOD()).toBe('full');
    });

    it('should allow multiple subscribers', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsub1 = subscribe(listener1);
      const unsub2 = subscribe(listener2);

      setGraphScale(0.4); // full → compact

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);

      unsub1();

      setGraphScale(0.2); // compact → micro

      expect(listener1).toHaveBeenCalledTimes(1); // Unsubscribed
      expect(listener2).toHaveBeenCalledTimes(2);

      unsub2();
    });

    it('should unsubscribe correctly', () => {
      const listener = vi.fn();
      const unsubscribe = subscribe(listener);

      setGraphScale(0.4); // Trigger change
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();

      setGraphScale(0.2); // Trigger another change
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('Boundary Value Tests', () => {
    it('should handle boundary at 0.5 correctly (full, not compact)', () => {
      setGraphScale(0.5);
      expect(getCurrentLOD()).toBe('full');
    });

    it('should handle boundary at 0.25 correctly (compact, not micro)', () => {
      setGraphScale(0.25);
      expect(getCurrentLOD()).toBe('compact');
    });

    it('should handle boundary at 0.499 correctly (compact)', () => {
      setGraphScale(0.499);
      expect(getCurrentLOD()).toBe('compact');
    });

    it('should handle boundary at 0.249 correctly (micro)', () => {
      setGraphScale(0.249);
      expect(getCurrentLOD()).toBe('micro');
    });
  });
});
