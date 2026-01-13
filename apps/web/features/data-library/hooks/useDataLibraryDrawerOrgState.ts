'use client';

import { useCallback, useState, useEffect } from 'react';
import type { TaskStatus } from '@cdm/types';

// Storage keys for localStorage persistence
const NODE_EXPANDED_KEY_PREFIX = 'cdm-data-library-node-expanded';

export interface UseDataLibraryDrawerOrgStateResult {
  selectedPbsId: string | null;
  setSelectedPbsId: (next: string | null) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (next: string | null) => void;
  selectedFolderId: string | null;
  setSelectedFolderId: (next: string | null) => void;
  pbsIncludeSubNodes: boolean;
  setPbsIncludeSubNodes: (next: boolean) => void;
  pbsExpandedIds: Set<string>;
  togglePbsExpand: (nodeId: string) => void;
  taskExpandedGroups: Set<TaskStatus>;
  toggleTaskGroup: (status: TaskStatus) => void;
  folderExpandedIds: Set<string>;
  toggleFolderExpand: (folderId: string) => void;
  // Story 9.8: Node view expanded state with localStorage persistence
  nodeExpandedIds: Set<string>;
  toggleNodeExpand: (nodeId: string) => void;
  setNodeExpandedIds: (ids: Set<string>) => void;
}

// Helper to load Set from localStorage
function loadSetFromStorage(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    // Ignore parse errors
  }
  return new Set();
}

// Helper to save Set to localStorage
function saveSetToStorage(key: string, set: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {
    // Ignore storage errors
  }
}

export function useDataLibraryDrawerOrgState(graphId: string): UseDataLibraryDrawerOrgStateResult {
  const nodeExpandedStorageKey = `${NODE_EXPANDED_KEY_PREFIX}-${graphId}`;
  const [selectedPbsId, setSelectedPbsId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [pbsIncludeSubNodes, setPbsIncludeSubNodes] = useState(false);

  const [pbsExpandedIds, setPbsExpandedIds] = useState<Set<string>>(() => new Set());
  const [taskExpandedGroups, setTaskExpandedGroups] = useState<Set<TaskStatus>>(
    () => new Set(['todo', 'in-progress', 'done'])
  );
  const [folderExpandedIds, setFolderExpandedIds] = useState<Set<string>>(() => new Set());

  // Story 9.8: Node expanded IDs with localStorage persistence (Task 4.8)
  const [nodeExpandedIds, setNodeExpandedIdsState] = useState<Set<string>>(() =>
    loadSetFromStorage(nodeExpandedStorageKey)
  );

  // Persist nodeExpandedIds to localStorage when it changes
  useEffect(() => {
    saveSetToStorage(nodeExpandedStorageKey, nodeExpandedIds);
  }, [nodeExpandedIds, nodeExpandedStorageKey]);

  const togglePbsExpand = useCallback((nodeId: string) => {
    setPbsExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const toggleTaskGroup = useCallback((status: TaskStatus) => {
    setTaskExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  const toggleFolderExpand = useCallback((folderId: string) => {
    setFolderExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }, []);

  // Story 9.8: Toggle node expand with persistence
  const toggleNodeExpand = useCallback((nodeId: string) => {
    setNodeExpandedIdsState((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const setNodeExpandedIds = useCallback((ids: Set<string>) => {
    setNodeExpandedIdsState(ids);
  }, []);

  return {
    selectedPbsId,
    setSelectedPbsId,
    selectedTaskId,
    setSelectedTaskId,
    selectedFolderId,
    setSelectedFolderId,
    pbsIncludeSubNodes,
    setPbsIncludeSubNodes,
    pbsExpandedIds,
    togglePbsExpand,
    taskExpandedGroups,
    toggleTaskGroup,
    folderExpandedIds,
    toggleFolderExpand,
    // Story 9.8
    nodeExpandedIds,
    toggleNodeExpand,
    setNodeExpandedIds,
  };
}
