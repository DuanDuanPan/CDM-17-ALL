/**
 * Story 2.2: useDependencyMode Hook Unit Tests
 * Tests for dependency mode state management
 */

import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDependencyMode } from '@/hooks/useDependencyMode';

describe('useDependencyMode', () => {
  describe('initial state', () => {
    it('should initialize with dependency mode disabled', () => {
      const { result } = renderHook(() => useDependencyMode());

      expect(result.current.isDependencyMode).toBe(false);
    });

    it('should return all expected properties', () => {
      const { result } = renderHook(() => useDependencyMode());

      expect(result.current).toHaveProperty('isDependencyMode');
      expect(result.current).toHaveProperty('toggleDependencyMode');
      expect(result.current).toHaveProperty('setDependencyMode');
      expect(typeof result.current.toggleDependencyMode).toBe('function');
      expect(typeof result.current.setDependencyMode).toBe('function');
    });
  });

  describe('toggleDependencyMode', () => {
    it('should toggle from false to true', () => {
      const { result } = renderHook(() => useDependencyMode());

      act(() => {
        result.current.toggleDependencyMode();
      });

      expect(result.current.isDependencyMode).toBe(true);
    });

    it('should toggle from true to false', () => {
      const { result } = renderHook(() => useDependencyMode());

      // First toggle: false -> true
      act(() => {
        result.current.toggleDependencyMode();
      });
      expect(result.current.isDependencyMode).toBe(true);

      // Second toggle: true -> false
      act(() => {
        result.current.toggleDependencyMode();
      });
      expect(result.current.isDependencyMode).toBe(false);
    });

    it('should handle multiple toggles correctly', () => {
      const { result } = renderHook(() => useDependencyMode());

      // Toggle 5 times
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.toggleDependencyMode();
        });
      }

      // After odd number of toggles, should be true
      expect(result.current.isDependencyMode).toBe(true);
    });
  });

  describe('setDependencyMode', () => {
    it('should set dependency mode to true', () => {
      const { result } = renderHook(() => useDependencyMode());

      act(() => {
        result.current.setDependencyMode(true);
      });

      expect(result.current.isDependencyMode).toBe(true);
    });

    it('should set dependency mode to false', () => {
      const { result } = renderHook(() => useDependencyMode());

      // First enable
      act(() => {
        result.current.setDependencyMode(true);
      });

      // Then disable
      act(() => {
        result.current.setDependencyMode(false);
      });

      expect(result.current.isDependencyMode).toBe(false);
    });

    it('should allow setting to same value without error', () => {
      const { result } = renderHook(() => useDependencyMode());

      // Set to true twice
      act(() => {
        result.current.setDependencyMode(true);
      });
      act(() => {
        result.current.setDependencyMode(true);
      });

      expect(result.current.isDependencyMode).toBe(true);
    });
  });

  describe('function reference stability', () => {
    it('should maintain stable function references across re-renders', () => {
      const { result, rerender } = renderHook(() => useDependencyMode());

      const initialToggle = result.current.toggleDependencyMode;
      const initialSet = result.current.setDependencyMode;

      // Re-render the hook
      rerender();

      // Functions should be the same reference (useCallback optimization)
      expect(result.current.toggleDependencyMode).toBe(initialToggle);
      expect(result.current.setDependencyMode).toBe(initialSet);
    });
  });
});
