/**
 * Story 9.2: Organization Tabs Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationTabs, useOrganizationView } from '../OrganizationTabs';
import { renderHook, act } from '@testing-library/react';

describe('OrganizationTabs', () => {
  const defaultProps = {
    activeView: 'pbs' as const,
    onViewChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all three tabs', () => {
    render(<OrganizationTabs {...defaultProps} />);

    expect(screen.getByTestId('org-tab-pbs')).toBeTruthy();
    expect(screen.getByTestId('org-tab-task')).toBeTruthy();
    expect(screen.getByTestId('org-tab-folder')).toBeTruthy();
  });

  it('shows PBS tab as active when activeView is pbs', () => {
    render(<OrganizationTabs {...defaultProps} activeView="pbs" />);

    const pbsTab = screen.getByTestId('org-tab-pbs');
    expect(pbsTab.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows Task tab as active when activeView is task', () => {
    render(<OrganizationTabs {...defaultProps} activeView="task" />);

    const taskTab = screen.getByTestId('org-tab-task');
    expect(taskTab.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows Folder tab as active when activeView is folder', () => {
    render(<OrganizationTabs {...defaultProps} activeView="folder" />);

    const folderTab = screen.getByTestId('org-tab-folder');
    expect(folderTab.getAttribute('aria-pressed')).toBe('true');
  });

  it('calls onViewChange when clicking a tab', () => {
    const onViewChange = vi.fn();
    render(<OrganizationTabs {...defaultProps} onViewChange={onViewChange} />);

    fireEvent.click(screen.getByTestId('org-tab-task'));
    expect(onViewChange).toHaveBeenCalledWith('task');

    fireEvent.click(screen.getByTestId('org-tab-folder'));
    expect(onViewChange).toHaveBeenCalledWith('folder');
  });

  it('displays correct labels in Chinese', () => {
    render(<OrganizationTabs {...defaultProps} />);

    expect(screen.getByText('PBS')).toBeTruthy();
    expect(screen.getByText('任务')).toBeTruthy();
    expect(screen.getByText('文件夹')).toBeTruthy();
  });
});

describe('useOrganizationView', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  it('returns pbs as default view', () => {
    const { result } = renderHook(() => useOrganizationView('test-graph'));

    expect(result.current[0]).toBe('pbs');
  });

  it('persists view to localStorage', () => {
    const { result } = renderHook(() => useOrganizationView('test-graph'));

    act(() => {
      result.current[1]('task');
    });

    expect(result.current[0]).toBe('task');
    expect(localStorage.getItem('cdm-data-library-org-view-test-graph')).toBe('task');
  });

  it('restores view from localStorage', () => {
    localStorage.setItem('cdm-data-library-org-view-test-graph', 'folder');

    const { result } = renderHook(() => useOrganizationView('test-graph'));

    expect(result.current[0]).toBe('folder');
  });

  it('ignores invalid stored values', () => {
    localStorage.setItem('cdm-data-library-org-view-test-graph', 'invalid');

    const { result } = renderHook(() => useOrganizationView('test-graph'));

    expect(result.current[0]).toBe('pbs');
  });

  it('uses different storage keys for different graphs', () => {
    const { result: result1 } = renderHook(() => useOrganizationView('graph-1'));
    const { result: result2 } = renderHook(() => useOrganizationView('graph-2'));

    act(() => {
      result1.current[1]('task');
    });

    expect(result1.current[0]).toBe('task');
    expect(result2.current[0]).toBe('pbs');
  });
});
