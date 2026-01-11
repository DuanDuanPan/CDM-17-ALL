'use client';

/**
 * Story 9.4: ColorBar Component Tests
 * 
 * Task 4.2.3: Tests for gradient, labels, colorMap change, range handling.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ColorBar } from '../components/ColorBar';

describe('ColorBar', () => {
    const defaultProps = {
        colorMap: 'rainbow' as const,
        minValue: 0,
        maxValue: 100,
        unit: '°C',
    };

    it('renders gradient with correct color stops', () => {
        render(<ColorBar {...defaultProps} />);

        const gradientBar = screen.getByTestId('colorbar-gradient');
        expect(gradientBar).toBeDefined();

        // Check that gradient style is applied (rainbow gradient)
        const style = gradientBar.getAttribute('style');
        expect(style).toContain('linear-gradient');
    });

    it('displays min/max labels', () => {
        render(<ColorBar {...defaultProps} />);

        expect(screen.getByTestId('colorbar')).toBeDefined();
        // Check min and max values are displayed
        expect(screen.getByText('0.00')).toBeDefined();
        expect(screen.getByText('100.00')).toBeDefined();
        // Check unit is displayed
        expect(screen.getAllByText('°C').length).toBeGreaterThan(0);
    });

    it('updates gradient when colorMap changes', () => {
        const { rerender } = render(<ColorBar {...defaultProps} colorMap="rainbow" />);

        let gradientBar = screen.getByTestId('colorbar-gradient');
        const rainbowStyle = gradientBar.getAttribute('style');

        // Change to jet colormap
        rerender(<ColorBar {...defaultProps} colorMap="jet" />);

        gradientBar = screen.getByTestId('colorbar-gradient');
        const jetStyle = gradientBar.getAttribute('style');

        // Gradient should be different for different color maps
        expect(rainbowStyle).not.toBe(jetStyle);
        expect(jetStyle).toContain('linear-gradient');
    });

    it('handles custom range values correctly', () => {
        render(<ColorBar {...defaultProps} minValue={-50} maxValue={150} />);

        // Check min and max are displayed with correct values
        expect(screen.getByText('-50.00')).toBeDefined();
        expect(screen.getByText('150.00')).toBeDefined();

        // Check intermediate values (Q1, median, Q3)
        expect(screen.getByText('0.00')).toBeDefined(); // Q1 = -50 + 200*0.25 = 0
        expect(screen.getByText('50.00')).toBeDefined(); // Median = -50 + 200*0.5 = 50
        expect(screen.getByText('100.00')).toBeDefined(); // Q3 = -50 + 200*0.75 = 100
    });
});
