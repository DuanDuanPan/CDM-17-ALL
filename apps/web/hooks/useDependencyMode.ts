/**
 * Story 2.2: Dependency Mode Hook
 * Manages the state for dependency edge creation mode
 */

'use client';

import { useState, useCallback } from 'react';

export interface UseDependencyModeReturn {
  /** Whether dependency mode is active */
  isDependencyMode: boolean;
  /** Toggle dependency mode on/off */
  toggleDependencyMode: () => void;
  /** Explicitly set dependency mode */
  setDependencyMode: (enabled: boolean) => void;
}

/**
 * Hook to manage dependency edge creation mode.
 * When dependency mode is active, new edges created via user interaction
 * will be dependency edges instead of hierarchical edges.
 */
export function useDependencyMode(): UseDependencyModeReturn {
  const [isDependencyMode, setIsDependencyMode] = useState(false);

  const toggleDependencyMode = useCallback(() => {
    setIsDependencyMode((prev) => !prev);
  }, []);

  const setDependencyMode = useCallback((enabled: boolean) => {
    setIsDependencyMode(enabled);
  }, []);

  return {
    isDependencyMode,
    toggleDependencyMode,
    setDependencyMode,
  };
}
