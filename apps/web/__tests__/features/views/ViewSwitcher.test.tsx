'use client';

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewSwitcher } from '@/features/views/components/ViewSwitcher';
import { useViewStore } from '@/features/views/stores/useViewStore';

describe('ViewSwitcher', () => {
  beforeEach(() => {
    useViewStore.getState().resetAllViewState();
  });

  it('renders all view options', () => {
    render(<ViewSwitcher />);

    expect(screen.getByTestId('view-switcher')).toBeTruthy();
    expect(screen.getByTestId('view-graph')).toBeTruthy();
    expect(screen.getByTestId('view-kanban')).toBeTruthy();
    expect(screen.getByTestId('view-gantt')).toBeTruthy();
  });

  it('switches to Kanban view when clicked', () => {
    render(<ViewSwitcher />);

    fireEvent.click(screen.getByTestId('view-kanban'));

    expect(useViewStore.getState().viewMode).toBe('kanban');
  });

  it('switches to Gantt view when clicked', () => {
    render(<ViewSwitcher />);

    fireEvent.click(screen.getByTestId('view-gantt'));

    expect(useViewStore.getState().viewMode).toBe('gantt');
  });
});
