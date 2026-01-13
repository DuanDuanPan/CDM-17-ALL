/**
 * Story 9.7: useContextAwareUpload Hook Unit Tests
 * Story 9.8: Updated for merged node view (PBS+Task combined)
 * Task 4.2: Test upload mode detection for Node/Folder views
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useContextAwareUpload } from '@/features/data-library/hooks/useContextAwareUpload';
import { NodeType } from '@cdm/types';

describe('useContextAwareUpload', () => {
    describe('Folder mode (AC2)', () => {
        it('returns folder mode when orgView is folder', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'folder',
                    activeNodeId: null,
                    activeNodeType: null,
                    selectedFolderId: 'folder-1',
                })
            );

            expect(result.current.mode).toBe('folder');
            expect(result.current.folderId).toBe('folder-1');
            expect(result.current.nodeId).toBeUndefined();
            expect(result.current.defaultLinkType).toBeUndefined();
        });

        it('returns folder mode with undefined folderId when none selected', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'folder',
                    activeNodeId: null,
                    activeNodeType: null,
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('folder');
            expect(result.current.folderId).toBeUndefined();
        });
    });

    describe('Node mode - TASK node (Story 9.8)', () => {
        it('returns node-link mode with output default when TASK node is active', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'node',
                    activeNodeId: 'task-1',
                    activeNodeType: NodeType.TASK,
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('node-link');
            expect(result.current.nodeId).toBe('task-1');
            expect(result.current.defaultLinkType).toBe('output');
        });
    });

    describe('Node mode - PBS node (Story 9.8)', () => {
        it('returns node-link mode with reference default when PBS node is active', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'node',
                    activeNodeId: 'pbs-1',
                    activeNodeType: NodeType.PBS,
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('node-link');
            expect(result.current.nodeId).toBe('pbs-1');
            expect(result.current.defaultLinkType).toBe('reference');
        });

        it('returns unlinked mode when no node is active in node view', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'node',
                    activeNodeId: null,
                    activeNodeType: null,
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('unlinked');
        });
    });

    describe('Unlinked mode (AC5)', () => {
        it('returns unlinked mode when orgView is node but no node selected', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'node',
                    activeNodeId: null,
                    activeNodeType: null,
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('unlinked');
            expect(result.current.nodeId).toBeUndefined();
            expect(result.current.folderId).toBeUndefined();
            expect(result.current.defaultLinkType).toBeUndefined();
        });
    });

    describe('Legacy props backward compatibility (Story 9.8)', () => {
        it('uses legacy selectedPbsId when activeNodeId not provided', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'node',
                    selectedPbsId: 'pbs-1',
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('node-link');
            expect(result.current.nodeId).toBe('pbs-1');
        });

        it('uses legacy selectedTaskId when activeNodeId not provided', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'node',
                    selectedTaskId: 'task-1',
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('node-link');
            expect(result.current.nodeId).toBe('task-1');
        });

        it('prefers activeNodeId over legacy props', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'node',
                    activeNodeId: 'node-new',
                    activeNodeType: NodeType.PBS,
                    selectedPbsId: 'pbs-legacy',
                    selectedTaskId: 'task-legacy',
                    selectedFolderId: null,
                })
            );

            expect(result.current.nodeId).toBe('node-new');
        });
    });

    describe('Cross-tab state isolation (State Matrix Edge Cases)', () => {
        it('Node view ignores selectedFolderId', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'node',
                    activeNodeId: 'pbs-1',
                    activeNodeType: NodeType.PBS,
                    selectedFolderId: 'folder-1', // Should be ignored
                })
            );

            expect(result.current.mode).toBe('node-link');
            expect(result.current.nodeId).toBe('pbs-1');
            expect(result.current.folderId).toBeUndefined();
        });

        it('Folder view ignores activeNodeId - uses folder mode', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'folder',
                    activeNodeId: 'pbs-1', // Should be ignored
                    activeNodeType: NodeType.PBS,
                    selectedFolderId: 'folder-1',
                })
            );

            expect(result.current.mode).toBe('folder');
            expect(result.current.folderId).toBe('folder-1');
            expect(result.current.nodeId).toBeUndefined();
        });
    });
});
