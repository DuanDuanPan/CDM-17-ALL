'use client';

/**
 * Story 9.4: useContourViewer Hook Tests
 *
 * Task 4.2.4: Tests for init, error, setColorMap, setRange, cleanup.
 */

import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useContourViewer } from '../hooks/useContourViewer';

// Mock the loadContourData utility
vi.mock('../utils/loadContourData', () => ({
    loadContourData: vi.fn(),
}));

// Mock VTK.js modules (hook imports these dynamically)
vi.mock('@kitware/vtk.js/Rendering/Profiles/Geometry', () => ({}));

vi.mock('@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow', () => ({
    default: {
        newInstance: vi.fn(() => ({
            getRenderer: () => ({
                addActor: vi.fn(),
                resetCamera: vi.fn(),
            }),
            getRenderWindow: () => ({
                render: vi.fn(),
            }),
            delete: vi.fn(),
        })),
    },
}));

vi.mock('@kitware/vtk.js/Rendering/Core/Mapper', () => ({
    default: {
        newInstance: vi.fn(() => ({
            setInputData: vi.fn(),
            setLookupTable: vi.fn(),
            setScalarRange: vi.fn(),
        })),
    },
}));

vi.mock('@kitware/vtk.js/Rendering/Core/Actor', () => ({
    default: {
        newInstance: vi.fn(() => ({
            setMapper: vi.fn(),
        })),
    },
}));

vi.mock('@kitware/vtk.js/Rendering/Core/ColorTransferFunction', () => ({
    default: {
        newInstance: vi.fn(() => ({
            addRGBPoint: vi.fn(),
            removeAllPoints: vi.fn(),
        })),
    },
}));

import { loadContourData } from '../utils/loadContourData';

const mockLoadContourData = vi.mocked(loadContourData);

function HookHarness({ dataUrl }: { dataUrl: string }) {
    const { containerRef, isLoading, error, colorMap, setColorMap, range, setRange, scalarName, unit } =
        useContourViewer({ dataUrl });

    return (
        <div>
            <div ref={containerRef} data-testid="host" />
            <div data-testid="isLoading">{String(isLoading)}</div>
            <div data-testid="error">{error?.message ?? ''}</div>
            <div data-testid="colorMap">{colorMap}</div>
            <div data-testid="range">{`${range.min},${range.max}`}</div>
            <div data-testid="scalarName">{scalarName ?? ''}</div>
            <div data-testid="unit">{unit ?? ''}</div>

            <button type="button" onClick={() => setColorMap('jet')} data-testid="set-jet" />
            <button type="button" onClick={() => setRange(10, 90)} data-testid="set-range" />
        </div>
    );
}

describe('useContourViewer', () => {
    const mockData = {
        getPointData: () => ({
            getScalars: () => ({
                getRange: () => [0, 100],
                getName: () => 'Temperature',
            }),
        }),
    };

    beforeEach(() => {
        mockLoadContourData.mockResolvedValue({
            data: mockData,
            scalarName: 'Temperature',
            unit: '°C',
            scalarRange: [0, 100],
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('initializes with loading state', () => {
        render(<HookHarness dataUrl="/test.vtp" />);
        expect(screen.getByTestId('isLoading').textContent).toBe('true');
        expect(screen.getByTestId('error').textContent).toBe('');
    });

    it('loads data and exposes scalar metadata', async () => {
        render(<HookHarness dataUrl="/test.vtp" />);

        await waitFor(() => {
            expect(screen.getByTestId('isLoading').textContent).toBe('false');
        });

        expect(mockLoadContourData).toHaveBeenCalledWith('/test.vtp');
        expect(screen.getByTestId('scalarName').textContent).toBe('Temperature');
        expect(screen.getByTestId('unit').textContent).toBe('°C');
    });

    it('surfaces load errors', async () => {
        mockLoadContourData.mockRejectedValueOnce(new Error('Unsupported format'));

        render(<HookHarness dataUrl="/test.invalid" />);

        await waitFor(() => {
            expect(screen.getByTestId('isLoading').textContent).toBe('false');
        });

        expect(screen.getByTestId('error').textContent).toBe('Unsupported format');
    });

    it('updates colorMap via setColorMap', async () => {
        const user = userEvent.setup();
        render(<HookHarness dataUrl="/test.vtp" />);

        await waitFor(() => {
            expect(screen.getByTestId('isLoading').textContent).toBe('false');
        });

        expect(screen.getByTestId('colorMap').textContent).toBe('rainbow');
        await user.click(screen.getByTestId('set-jet'));
        await waitFor(() => {
            expect(screen.getByTestId('colorMap').textContent).toBe('jet');
        });
    });

    it('updates range via setRange', async () => {
        const user = userEvent.setup();
        render(<HookHarness dataUrl="/test.vtp" />);

        await waitFor(() => {
            expect(screen.getByTestId('isLoading').textContent).toBe('false');
        });

        await user.click(screen.getByTestId('set-range'));
        await waitFor(() => {
            expect(screen.getByTestId('range').textContent).toBe('10,90');
        });
    });
});
