/**
 * Story 9.2: Organization Tabs Component Tests
 * Story 9.8: Updated for merged node view (PBS+Task combined)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationTabs, useOrganizationView } from '../OrganizationTabs';
import { renderHook, act } from '@testing-library/react';

describe('OrganizationTabs', () => {
  const defaultProps = {
    activeView: 'node' as const,
    onViewChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Story 9.8: Updated - now only 2 tabs (node + folder)
  it('renders both tabs (node and folder)', () => {
    render(<OrganizationTabs {...defaultProps} />);

    expect(screen.getByTestId('org-tab-node')).toBeTruthy();
    expect(screen.getByTestId('org-tab-folder')).toBeTruthy();
    // PBS and Task tabs should no longer exist
    expect(screen.queryByTestId('org-tab-pbs')).toBeNull();
    expect(screen.queryByTestId('org-tab-task')).toBeNull();
  });

  it('shows Node tab as active when activeView is node', () => {
    render(<OrganizationTabs {...defaultProps} activeView="node" />);

    const nodeTab = screen.getByTestId('org-tab-node');
    expect(nodeTab.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows Folder tab as active when activeView is folder', () => {
    render(<OrganizationTabs {...defaultProps} activeView="folder" />);

    const folderTab = screen.getByTestId('org-tab-folder');
    expect(folderTab.getAttribute('aria-pressed')).toBe('true');
  });

  it('calls onViewChange when clicking a tab', () => {
    const onViewChange = vi.fn();
    render(<OrganizationTabs {...defaultProps} onViewChange={onViewChange} />);

    fireEvent.click(screen.getByTestId('org-tab-folder'));
    expect(onViewChange).toHaveBeenCalledWith('folder');

    fireEvent.click(screen.getByTestId('org-tab-node'));
    expect(onViewChange).toHaveBeenCalledWith('node');
  });

  // Story 9.8: Updated labels
  it('displays correct labels in Chinese', () => {
    render(<OrganizationTabs {...defaultProps} />);

    expect(screen.getByText('节点（PBS+任务）')).toBeTruthy();
    expect(screen.getByText('文件夹')).toBeTruthy();
  });
});

describe('useOrganizationView', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  // Story 9.8: Updated - default is now 'node'
  it('returns node as default view', () => {
    const { result } = renderHook(() => useOrganizationView('test-graph'));

    expect(result.current[0]).toBe('node');
  });

  it('persists view to localStorage', () => {
    const { result } = renderHook(() => useOrganizationView('test-graph'));

    act(() => {
      result.current[1]('folder');
    });

    expect(result.current[0]).toBe('folder');
    expect(localStorage.getItem('cdm-data-library-org-view-test-graph')).toBe('folder');
  });

  it('restores view from localStorage', () => {
    localStorage.setItem('cdm-data-library-org-view-test-graph', 'folder');

    const { result } = renderHook(() => useOrganizationView('test-graph'));

    expect(result.current[0]).toBe('folder');
  });

  it('ignores invalid stored values', () => {
    localStorage.setItem('cdm-data-library-org-view-test-graph', 'invalid');

    const { result } = renderHook(() => useOrganizationView('test-graph'));

    expect(result.current[0]).toBe('node');
  });

  // Story 9.8: Migration test - old 'pbs' value should migrate to 'node'
  it('migrates old pbs value to node', () => {
    localStorage.setItem('cdm-data-library-org-view-test-graph', 'pbs');

    const { result } = renderHook(() => useOrganizationView('test-graph'));

    expect(result.current[0]).toBe('node');
    expect(localStorage.getItem('cdm-data-library-org-view-test-graph')).toBe('node');
  });

  // Story 9.8: Migration test - old 'task' value should migrate to 'node'
  it('migrates old task value to node', () => {
    localStorage.setItem('cdm-data-library-org-view-test-graph', 'task');

    const { result } = renderHook(() => useOrganizationView('test-graph'));

    expect(result.current[0]).toBe('node');
    expect(localStorage.getItem('cdm-data-library-org-view-test-graph')).toBe('node');
  });

  it('uses different storage keys for different graphs', () => {
    const { result: result1 } = renderHook(() => useOrganizationView('graph-1'));
    const { result: result2 } = renderHook(() => useOrganizationView('graph-2'));

    act(() => {
      result1.current[1]('folder');
    });

    expect(result1.current[0]).toBe('folder');
    expect(result2.current[0]).toBe('node');
  });
});
