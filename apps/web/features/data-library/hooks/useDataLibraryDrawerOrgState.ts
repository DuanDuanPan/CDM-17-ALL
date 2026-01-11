'use client';

import { useCallback, useState } from 'react';
import type { TaskStatus } from '@cdm/types';

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
}

export function useDataLibraryDrawerOrgState(): UseDataLibraryDrawerOrgStateResult {
  const [selectedPbsId, setSelectedPbsId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [pbsIncludeSubNodes, setPbsIncludeSubNodes] = useState(false);

  const [pbsExpandedIds, setPbsExpandedIds] = useState<Set<string>>(() => new Set());
  const [taskExpandedGroups, setTaskExpandedGroups] = useState<Set<TaskStatus>>(
    () => new Set(['todo', 'in-progress', 'done'])
  );
  const [folderExpandedIds, setFolderExpandedIds] = useState<Set<string>>(() => new Set());

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
  };
}

