'use client';

/**
 * Story 8.3: ZoomIndicator component tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ZoomIndicator } from '@/components/graph/parts/ZoomIndicator';

describe('ZoomIndicator', () => {
    it('renders zoom percentage correctly', () => {
        const onReset = vi.fn();

        render(<ZoomIndicator zoom={1} onReset={onReset} />);

        expect(screen.getByTestId('zoom-indicator')).toBeTruthy();
        expect(screen.getByText('100%')).toBeTruthy();
    });

    it('displays correct percentage for zoom levels', () => {
        const onReset = vi.fn();

        const { rerender } = render(<ZoomIndicator zoom={0.5} onReset={onReset} />);
        expect(screen.getByText('50%')).toBeTruthy();

        rerender(<ZoomIndicator zoom={1.5} onReset={onReset} />);
        expect(screen.getByText('150%')).toBeTruthy();

        rerender(<ZoomIndicator zoom={0.75} onReset={onReset} />);
        expect(screen.getByText('75%')).toBeTruthy();

        rerender(<ZoomIndicator zoom={2} onReset={onReset} />);
        expect(screen.getByText('200%')).toBeTruthy();
    });

    it('rounds zoom percentage correctly', () => {
        const onReset = vi.fn();

        const { rerender } = render(<ZoomIndicator zoom={0.333} onReset={onReset} />);
        expect(screen.getByText('33%')).toBeTruthy();

        rerender(<ZoomIndicator zoom={0.666} onReset={onReset} />);
        expect(screen.getByText('67%')).toBeTruthy();

        rerender(<ZoomIndicator zoom={1.234} onReset={onReset} />);
        expect(screen.getByText('123%')).toBeTruthy();
    });

    it('calls onReset when clicked', async () => {
        const onReset = vi.fn();
        const user = userEvent.setup();

        render(<ZoomIndicator zoom={0.75} onReset={onReset} />);

        await user.click(screen.getByTestId('zoom-indicator'));

        expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('is disabled when disabled prop is true', () => {
        const onReset = vi.fn();

        render(<ZoomIndicator zoom={1} onReset={onReset} disabled />);

        const button = screen.getByTestId('zoom-indicator');
        expect(button).toHaveProperty('disabled', true);
    });

    it('has correct aria-label for accessibility', () => {
        const onReset = vi.fn();

        const { rerender } = render(<ZoomIndicator zoom={0.5} onReset={onReset} />);
        expect(screen.getByLabelText('当前缩放 50%，点击重置为 100%')).toBeTruthy();

        rerender(<ZoomIndicator zoom={1.25} onReset={onReset} />);
        expect(screen.getByLabelText('当前缩放 125%，点击重置为 100%')).toBeTruthy();
    });

    it('has correct title tooltip', () => {
        const onReset = vi.fn();

        render(<ZoomIndicator zoom={1} onReset={onReset} />);

        const button = screen.getByTestId('zoom-indicator');
        expect(button.getAttribute('title')).toBe('点击重置为 100%');
    });
});
