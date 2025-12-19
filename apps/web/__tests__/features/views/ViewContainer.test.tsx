'use client';

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ViewContainer } from '@/features/views/components/ViewContainer';
import { useViewStore } from '@/features/views/stores/useViewStore';

vi.mock('@/hooks/useCollaboration', () => ({
  useCollaboration: vi.fn(() => ({
    yDoc: null,
    provider: null,
    awareness: null,
    isConnected: false,
    isSynced: false,
    syncStatus: 'idle',
    error: null,
    remoteUsers: [],
    updateCursor: vi.fn(),
    updateSelectedNode: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

vi.mock('@/components/graph', () => ({
  GraphComponent: () => <div data-testid="graph-view" />,
}));

vi.mock('@/features/views/components/KanbanView', () => ({
  KanbanBoard: () => <div data-testid="kanban-view" />,
}));

vi.mock('@/features/views/components/GanttView', () => ({
  GanttChart: () => <div data-testid="gantt-view" />,
}));

describe('ViewContainer', () => {
  const user = { id: 'user-1', name: '测试用户', color: '#3b82f6' };

  beforeEach(() => {
    useViewStore.getState().resetAllViewState();
  });

  it('renders graph view by default', () => {
    render(<ViewContainer graphId="graph-1" user={user} />);

    expect(screen.getByTestId('graph-view')).toBeTruthy();
  });

  it('renders kanban view when viewMode is kanban', () => {
    useViewStore.getState().setViewMode('kanban');

    render(<ViewContainer graphId="graph-1" user={user} />);

    expect(screen.getByTestId('kanban-view')).toBeTruthy();
  });

  it('renders gantt view when viewMode is gantt', () => {
    useViewStore.getState().setViewMode('gantt');

    render(<ViewContainer graphId="graph-1" user={user} />);

    expect(screen.getByTestId('gantt-view')).toBeTruthy();
  });
});
