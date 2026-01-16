/**
 * Unit tests for useUnifiedSidebar hook
 * 
 * Tests panel mutual exclusivity, node-dependent auto-collapse,
 * and force open functionality for notifications
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUnifiedSidebar } from '../../hooks/useUnifiedSidebar';

describe('useUnifiedSidebar', () => {
    describe('panel toggling', () => {
        it('should start with no active panel', () => {
            const { result } = renderHook(() =>
                useUnifiedSidebar({ selectedNodeId: null })
            );

            expect(result.current.activePanel).toBeNull();
            expect(result.current.isExpanded).toBe(false);
        });

        it('should open panel when togglePanel is called', () => {
            const { result } = renderHook(() =>
                useUnifiedSidebar({ selectedNodeId: null })
            );

            act(() => {
                result.current.togglePanel('templates');
            });

            expect(result.current.activePanel).toBe('templates');
            expect(result.current.isExpanded).toBe(true);
        });

        it('should close panel when same panel is toggled again', () => {
            const { result } = renderHook(() =>
                useUnifiedSidebar({ selectedNodeId: null })
            );

            act(() => {
                result.current.togglePanel('templates');
            });
            expect(result.current.activePanel).toBe('templates');

            act(() => {
                result.current.togglePanel('templates');
            });
            expect(result.current.activePanel).toBeNull();
            expect(result.current.isExpanded).toBe(false);
        });

        it('should switch panels when different panel is toggled', () => {
            const { result } = renderHook(() =>
                useUnifiedSidebar({ selectedNodeId: null })
            );

            act(() => {
                result.current.togglePanel('templates');
            });
            expect(result.current.activePanel).toBe('templates');

            act(() => {
                result.current.togglePanel('outline');
            });
            expect(result.current.activePanel).toBe('outline');
        });
    });

    describe('node-dependent panels', () => {
        it('should not open properties panel when no node is selected', () => {
            const { result } = renderHook(() =>
                useUnifiedSidebar({ selectedNodeId: null })
            );

            act(() => {
                result.current.togglePanel('properties');
            });

            // Should remain closed
            expect(result.current.activePanel).toBeNull();
        });

        it('should not open comments panel when no node is selected', () => {
            const { result } = renderHook(() =>
                useUnifiedSidebar({ selectedNodeId: null })
            );

            act(() => {
                result.current.togglePanel('comments');
            });

            // Should remain closed
            expect(result.current.activePanel).toBeNull();
        });

        it('should open properties panel when node is selected', () => {
            const { result } = renderHook(() =>
                useUnifiedSidebar({ selectedNodeId: 'node-1' })
            );

            act(() => {
                result.current.togglePanel('properties');
            });

            expect(result.current.activePanel).toBe('properties');
        });

        it('should auto-close properties panel when node is deselected', () => {
            const { result, rerender } = renderHook(
                ({ selectedNodeId }) => useUnifiedSidebar({ selectedNodeId }),
                { initialProps: { selectedNodeId: 'node-1' } }
            );

            // Open properties panel
            act(() => {
                result.current.togglePanel('properties');
            });
            expect(result.current.activePanel).toBe('properties');

            // Deselect node
            rerender({ selectedNodeId: null });

            // Panel should auto-close
            expect(result.current.activePanel).toBeNull();
        });

        it('should auto-close comments panel when node is deselected', () => {
            const { result, rerender } = renderHook(
                ({ selectedNodeId }) => useUnifiedSidebar({ selectedNodeId }),
                { initialProps: { selectedNodeId: 'node-1' } }
            );

            // Open comments panel
            act(() => {
                result.current.togglePanel('comments');
            });
            expect(result.current.activePanel).toBe('comments');

            // Deselect node
            rerender({ selectedNodeId: null });

            // Panel should auto-close
            expect(result.current.activePanel).toBeNull();
        });

        it('should NOT close non-node-dependent panels when node is deselected', () => {
            const { result, rerender } = renderHook(
                ({ selectedNodeId }) => useUnifiedSidebar({ selectedNodeId }),
                { initialProps: { selectedNodeId: 'node-1' } }
            );

            // Open templates panel (not node-dependent)
            act(() => {
                result.current.togglePanel('templates');
            });
            expect(result.current.activePanel).toBe('templates');

            // Deselect node
            rerender({ selectedNodeId: null });

            // Templates panel should remain open
            expect(result.current.activePanel).toBe('templates');
        });
    });

    describe('force open', () => {
        it('should allow force open of node-dependent panel without node', () => {
            const { result } = renderHook(() =>
                useUnifiedSidebar({ selectedNodeId: null })
            );

            // Normal open should fail
            act(() => {
                result.current.openPanel('comments');
            });
            expect(result.current.activePanel).toBeNull();

            // Force open should succeed
            act(() => {
                result.current.openPanel('comments', true);
            });
            expect(result.current.activePanel).toBe('comments');
        });
    });

    describe('closePanel', () => {
        it('should close the active panel', () => {
            const { result } = renderHook(() =>
                useUnifiedSidebar({ selectedNodeId: null })
            );

            act(() => {
                result.current.openPanel('templates');
            });
            expect(result.current.activePanel).toBe('templates');

            act(() => {
                result.current.closePanel();
            });
            expect(result.current.activePanel).toBeNull();
        });
    });

    describe('archive panel', () => {
        it('should open archive panel without node selected', () => {
            const { result } = renderHook(() =>
                useUnifiedSidebar({ selectedNodeId: null })
            );

            act(() => {
                result.current.togglePanel('archive');
            });

            // Archive is NOT node-dependent, should open
            expect(result.current.activePanel).toBe('archive');
        });
    });
});
