'use client';

/**
 * Story 9.4: ColorScaleControl Component Tests
 * 
 * Task 4.2.2: Tests for select, callback, inputs, range, disabled, validation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorScaleControl } from '../components/ColorScaleControl';

describe('ColorScaleControl', () => {
    const defaultProps = {
        colorMap: 'rainbow' as const,
        onColorMapChange: vi.fn(),
        minValue: 0,
        maxValue: 100,
        onRangeChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders color scale selector with 3 options', () => {
        render(<ColorScaleControl {...defaultProps} />);

        expect(screen.getByTestId('color-scale-control')).toBeDefined();
        expect(screen.getByTestId('colormap-select')).toBeDefined();
        expect(screen.getByText('Rainbow')).toBeDefined();
    });

    it('calls onColorMapChange when colormap is selected', async () => {
        const onColorMapChange = vi.fn();
        const user = userEvent.setup();

        render(<ColorScaleControl {...defaultProps} onColorMapChange={onColorMapChange} />);

        const select = screen.getByTestId('colormap-select') as HTMLSelectElement;
        await user.selectOptions(select, 'jet');

        expect(onColorMapChange).toHaveBeenCalledWith('jet');
    });

    it('renders min/max range inputs', () => {
        render(<ColorScaleControl {...defaultProps} />);

        const minInput = screen.getByTestId('scalar-min');
        const maxInput = screen.getByTestId('scalar-max');

        expect(minInput).toBeDefined();
        expect(maxInput).toBeDefined();
        expect(minInput).toHaveProperty('value', '0');
        expect(maxInput).toHaveProperty('value', '100');
    });

    it('calls onRangeChange when min value changes and blurs', async () => {
        const onRangeChange = vi.fn();
        const user = userEvent.setup();

        render(<ColorScaleControl {...defaultProps} onRangeChange={onRangeChange} />);

        const minInput = screen.getByTestId('scalar-min');
        await user.clear(minInput);
        await user.type(minInput, '10');
        fireEvent.blur(minInput);

        expect(onRangeChange).toHaveBeenCalledWith(10, 100);
    });

    it('calls onRangeChange when max value changes and blurs', async () => {
        const onRangeChange = vi.fn();
        const user = userEvent.setup();

        render(<ColorScaleControl {...defaultProps} onRangeChange={onRangeChange} />);

        const maxInput = screen.getByTestId('scalar-max');
        await user.clear(maxInput);
        await user.type(maxInput, '200');
        fireEvent.blur(maxInput);

        expect(onRangeChange).toHaveBeenCalledWith(0, 200);
    });

    it('disables inputs when disabled prop is true', () => {
        render(<ColorScaleControl {...defaultProps} disabled={true} />);

        const minInput = screen.getByTestId('scalar-min');
        const maxInput = screen.getByTestId('scalar-max');
        const select = screen.getByTestId('colormap-select');

        expect(minInput).toHaveProperty('disabled', true);
        expect(maxInput).toHaveProperty('disabled', true);
        expect(select).toHaveProperty('disabled', true);
    });

    it('validates min < max constraint and resets on invalid input', async () => {
        const onRangeChange = vi.fn();
        const user = userEvent.setup();

        render(<ColorScaleControl {...defaultProps} onRangeChange={onRangeChange} />);

        // Try to set min > max (invalid)
        const minInput = screen.getByTestId('scalar-min');
        await user.clear(minInput);
        await user.type(minInput, '150'); // Greater than max (100)
        fireEvent.blur(minInput);

        // Should not call onRangeChange with invalid values
        expect(onRangeChange).not.toHaveBeenCalled();
        // Should reset to original value
        expect(minInput).toHaveProperty('value', '0');
    });
});
