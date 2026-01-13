/**
 * Story 9.7: UploadTypeDropdown Unit Tests
 * Task 4.x: Test type selection + batch checkbox behavior
 */

import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { UploadTypeDropdown } from '@/features/data-library/components/UploadTypeDropdown';

describe('UploadTypeDropdown', () => {
  it('renders with default value', () => {
    const onChange = vi.fn();

    const { getByTestId } = render(
      <UploadTypeDropdown defaultValue="output" onChange={onChange} />
    );

    const select = getByTestId('upload-type-dropdown') as HTMLSelectElement;
    expect(select.value).toBe('output');
  });

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn();

    const { getByTestId } = render(
      <UploadTypeDropdown defaultValue="reference" onChange={onChange} />
    );

    const select = getByTestId('upload-type-dropdown') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'input' } });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('input');
  });

  it('resets selection when defaultValue changes', () => {
    const onChange = vi.fn();

    const { getByTestId, rerender } = render(
      <UploadTypeDropdown defaultValue="output" onChange={onChange} />
    );

    const select = getByTestId('upload-type-dropdown') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'input' } });
    expect(select.value).toBe('input');

    rerender(<UploadTypeDropdown defaultValue="reference" onChange={onChange} />);

    expect((getByTestId('upload-type-dropdown') as HTMLSelectElement).value).toBe('reference');
  });

  it('shows batch checkbox when enabled and calls onBatchChange', () => {
    const onChange = vi.fn();
    const onBatchChange = vi.fn();

    const { getByTestId } = render(
      <UploadTypeDropdown
        defaultValue="reference"
        onChange={onChange}
        showBatchCheckbox={true}
        batchApplyToAll={true}
        onBatchChange={onBatchChange}
      />
    );

    const checkbox = getByTestId('batch-apply-checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(onBatchChange).toHaveBeenCalledTimes(1);
    expect(onBatchChange).toHaveBeenCalledWith(false);
  });

  it('does not render batch checkbox when disabled', () => {
    const onChange = vi.fn();

    const { queryByTestId } = render(
      <UploadTypeDropdown defaultValue="reference" onChange={onChange} showBatchCheckbox={false} />
    );

    expect(queryByTestId('batch-apply-checkbox')).toBeNull();
  });
});
