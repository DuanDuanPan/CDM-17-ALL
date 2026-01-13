/**
 * Story 9.7: QuickTypePicker Unit Tests
 * Task 4.x: Test per-file type selection UI (portal + buttons)
 */

import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QuickTypePicker } from '@/features/data-library/components/QuickTypePicker';

describe('QuickTypePicker', () => {
  it('renders file name and progress', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    const { getByText, getByTestId } = render(
      <QuickTypePicker
        fileName="a.step"
        currentIndex={1}
        totalCount={3}
        onSelect={onSelect}
        onCancel={onCancel}
      />
    );

    expect(getByTestId('quick-type-picker')).toBeTruthy();
    expect(getByText('文件 (1/3)')).toBeTruthy();
    expect(getByText('a.step')).toBeTruthy();
  });

  it('calls onCancel when clicking the overlay', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    const { getByTestId } = render(
      <QuickTypePicker
        fileName="a.step"
        currentIndex={1}
        totalCount={1}
        onSelect={onSelect}
        onCancel={onCancel}
      />
    );

    fireEvent.click(getByTestId('quick-type-picker'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect when type button is clicked (and does not cancel)', () => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();

    const { getByTestId } = render(
      <QuickTypePicker
        fileName="a.step"
        currentIndex={1}
        totalCount={2}
        onSelect={onSelect}
        onCancel={onCancel}
      />
    );

    fireEvent.click(getByTestId('quick-type-input'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('input');
    expect(onCancel).not.toHaveBeenCalled();
  });
});

