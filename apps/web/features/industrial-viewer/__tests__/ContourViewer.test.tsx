'use client';

/**
 * Story 9.4: ContourViewer Component Tests
 * 
 * Task 4.2.1: Tests for loading, error, container, controls, and cleanup.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ContourViewer } from '../components/ContourViewer';

// Mock the useContourViewer hook
vi.mock('../hooks/useContourViewer', () => ({
    useContourViewer: vi.fn(),
}));

import { useContourViewer } from '../hooks/useContourViewer';

const mockUseContourViewer = vi.mocked(useContourViewer);

describe('ContourViewer', () => {
    const defaultMockResult = {
        containerRef: { current: null },
        isLoading: false,
        error: null,
        colorMap: 'rainbow' as const,
        setColorMap: vi.fn(),
        range: { min: 0, max: 100 },
        setRange: vi.fn(),
        scalarName: 'Temperature',
        unit: '°C',
    };

    beforeEach(() => {
        mockUseContourViewer.mockReturnValue(defaultMockResult);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state when isLoading is true', () => {
        mockUseContourViewer.mockReturnValue({
            ...defaultMockResult,
            isLoading: true,
        });

        render(<ContourViewer dataUrl="/test.vtp" />);

        expect(screen.getByTestId('loading-state')).toBeDefined();
        expect(screen.getByTestId('loading-spinner')).toBeDefined();
    });

    it('renders error state when error is set', () => {
        mockUseContourViewer.mockReturnValue({
            ...defaultMockResult,
            error: new Error('Failed to load VTP file'),
        });

        render(<ContourViewer dataUrl="/test.vtp" />);

        expect(screen.getByTestId('error-state')).toBeDefined();
        expect(screen.getByText('加载失败')).toBeDefined();
        expect(screen.getByText('Failed to load VTP file')).toBeDefined();
    });

    it('renders viewer container when loaded successfully', () => {
        render(<ContourViewer dataUrl="/test.vtp" />);

        expect(screen.getByTestId('contour-viewer-container')).toBeDefined();
        expect(screen.getByTestId('vtk-canvas')).toBeDefined();
        expect(screen.queryByTestId('loading-state')).toBeNull();
        expect(screen.queryByTestId('error-state')).toBeNull();
    });

    it('calls onControlsReady with controls when hook provides them', async () => {
        const onControlsReady = vi.fn();

        render(<ContourViewer dataUrl="/test.vtp" onControlsReady={onControlsReady} />);

        await waitFor(() => {
            expect(onControlsReady).toHaveBeenCalledWith({
                colorMap: 'rainbow',
                setColorMap: expect.any(Function),
                range: { min: 0, max: 100 },
                setRange: expect.any(Function),
                scalarName: 'Temperature',
                unit: '°C',
            });
        });
    });

    it('calls onError when error occurs', () => {
        const onError = vi.fn();
        const testError = new Error('Test error');

        mockUseContourViewer.mockReturnValue({
            ...defaultMockResult,
            error: testError,
        });

        render(<ContourViewer dataUrl="/test.vtp" onError={onError} />);

        expect(onError).toHaveBeenCalledWith(testError);
    });
});
