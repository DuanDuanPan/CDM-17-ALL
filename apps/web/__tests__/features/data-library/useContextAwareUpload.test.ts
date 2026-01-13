/**
 * Story 9.7: useContextAwareUpload Hook Unit Tests
 * Task 4.2: Test upload mode detection for PBS/Task/Folder views
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useContextAwareUpload } from '@/features/data-library/hooks/useContextAwareUpload';

describe('useContextAwareUpload', () => {
    describe('Folder mode (AC2)', () => {
        it('returns folder mode when orgView is folder', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'folder',
                    selectedPbsId: null,
                    selectedTaskId: null,
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
                    selectedPbsId: null,
                    selectedTaskId: null,
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('folder');
            expect(result.current.folderId).toBeUndefined();
        });
    });

    describe('Task mode (AC3)', () => {
        it('returns node-link mode with output default when task is selected', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'task',
                    selectedPbsId: null,
                    selectedTaskId: 'task-1',
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('node-link');
            expect(result.current.nodeId).toBe('task-1');
            expect(result.current.defaultLinkType).toBe('output');
        });

        it('returns unlinked mode when no task selected', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'task',
                    selectedPbsId: null,
                    selectedTaskId: null,
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('unlinked');
        });
    });

    describe('PBS mode (AC4)', () => {
        it('returns node-link mode with reference default when PBS node is selected', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'pbs',
                    selectedPbsId: 'pbs-1',
                    selectedTaskId: null,
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('node-link');
            expect(result.current.nodeId).toBe('pbs-1');
            expect(result.current.defaultLinkType).toBe('reference');
        });

        it('returns unlinked mode when no PBS node selected', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'pbs',
                    selectedPbsId: null,
                    selectedTaskId: null,
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('unlinked');
        });
    });

    describe('Unlinked mode (AC5)', () => {
        it('returns unlinked mode when orgView is pbs but no node selected', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'pbs',
                    selectedPbsId: null,
                    selectedTaskId: null,
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('unlinked');
            expect(result.current.nodeId).toBeUndefined();
            expect(result.current.folderId).toBeUndefined();
            expect(result.current.defaultLinkType).toBeUndefined();
        });
    });

    describe('Cross-tab state isolation (State Matrix Edge Cases)', () => {
        it('PBS view ignores selectedTaskId - uses PBS node', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'pbs',
                    selectedPbsId: 'pbs-1',
                    selectedTaskId: 'task-1', // Should be ignored
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('node-link');
            expect(result.current.nodeId).toBe('pbs-1');
            expect(result.current.defaultLinkType).toBe('reference');
        });

        it('Task view ignores selectedPbsId - uses task node', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'task',
                    selectedPbsId: 'pbs-1', // Should be ignored
                    selectedTaskId: 'task-1',
                    selectedFolderId: null,
                })
            );

            expect(result.current.mode).toBe('node-link');
            expect(result.current.nodeId).toBe('task-1');
            expect(result.current.defaultLinkType).toBe('output');
        });

        it('PBS view with selectedFolderId returns node-link (ignores folderId)', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'pbs',
                    selectedPbsId: 'pbs-1',
                    selectedTaskId: null,
                    selectedFolderId: 'folder-1', // Should be ignored
                })
            );

            expect(result.current.mode).toBe('node-link');
            expect(result.current.nodeId).toBe('pbs-1');
            expect(result.current.folderId).toBeUndefined();
        });

        it('Folder view ignores selectedPbsId - uses folder mode', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'folder',
                    selectedPbsId: 'pbs-1', // Should be ignored
                    selectedTaskId: null,
                    selectedFolderId: 'folder-1',
                })
            );

            expect(result.current.mode).toBe('folder');
            expect(result.current.folderId).toBe('folder-1');
            expect(result.current.nodeId).toBeUndefined();
        });

        it('Folder view ignores selectedTaskId - uses folder mode', () => {
            const { result } = renderHook(() =>
                useContextAwareUpload({
                    orgView: 'folder',
                    selectedPbsId: null,
                    selectedTaskId: 'task-1', // Should be ignored
                    selectedFolderId: 'folder-1',
                })
            );

            expect(result.current.mode).toBe('folder');
            expect(result.current.folderId).toBe('folder-1');
            expect(result.current.nodeId).toBeUndefined();
        });
    });
});
