/**
 * Story 7.2: useApproval Hook Tests
 * Tests for the approval workflow hook
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApproval } from '../useApproval';

// Mock dependencies
vi.mock('@/contexts', () => ({
    useCurrentUserId: () => 'test-user-id',
}));

describe('useApproval', () => {
    beforeEach(() => {
        global.fetch = vi.fn();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('fetchApproval', () => {
        it('should fetch approval status on mount', async () => {
            const mockApproval = { status: 'PENDING', steps: [], currentStepIndex: 0 };
            (fetch as Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ approval: mockApproval }),
            });

            const { result } = renderHook(() => useApproval('node-1'));

            await waitFor(() => {
                expect(result.current.approval).toEqual(mockApproval);
            });
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/approval/node-1')
            );
        });
    });

    describe('submit', () => {
        it('should submit approval with x-user-id header', async () => {
            (fetch as Mock)
                .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // initial fetch
                .mockResolvedValueOnce({ ok: true }) // submit
                .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // refetch

            const { result } = renderHook(() => useApproval('node-1'));

            await waitFor(() => expect(fetch).toHaveBeenCalled());

            await act(async () => {
                await result.current.submit();
            });

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/approval/node-1/submit'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({ 'x-user-id': 'test-user-id' }),
                })
            );
        });
    });

    describe('approve', () => {
        it('should approve with x-user-id header', async () => {
            (fetch as Mock)
                .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // initial fetch
                .mockResolvedValueOnce({ ok: true }) // approve
                .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // refetch

            const { result } = renderHook(() => useApproval('node-1'));

            await waitFor(() => expect(fetch).toHaveBeenCalled());

            await act(async () => {
                await result.current.approve();
            });

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/approval/node-1/approve'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({ 'x-user-id': 'test-user-id' }),
                })
            );
        });
    });

    describe('reject', () => {
        it('should reject with reason and x-user-id header', async () => {
            (fetch as Mock)
                .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // initial fetch
                .mockResolvedValueOnce({ ok: true }) // reject
                .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // refetch

            const { result } = renderHook(() => useApproval('node-1'));

            await waitFor(() => expect(fetch).toHaveBeenCalled());

            await act(async () => {
                await result.current.reject('设计需要修改');
            });

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/approval/node-1/reject'),
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ reason: '设计需要修改' }),
                })
            );
        });
    });

    describe('uploadDeliverable', () => {
        it('should upload file and associate deliverable', async () => {
            const mockFile = new File(['content'], 'test.pdf', {
                type: 'application/pdf',
            });

            (fetch as Mock)
                .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // initial fetch
                .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 'file-123' }) }) // file upload
                .mockResolvedValueOnce({ ok: true }) // deliverable association
                .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // refetch

            const { result } = renderHook(() => useApproval('node-1'));

            await waitFor(() => expect(fetch).toHaveBeenCalled());

            await act(async () => {
                await result.current.uploadDeliverable(mockFile);
            });

            // Check file upload call
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/files/upload'),
                expect.objectContaining({
                    method: 'POST',
                })
            );
        });
    });

    describe('deleteDeliverable', () => {
        it('should call DELETE endpoint and perform optimistic update', async () => {
            const initialDeliverables = [
                { id: 'd1', fileId: 'f1', fileName: 'file1.pdf', uploadedAt: '2024-01-01' },
                { id: 'd2', fileId: 'f2', fileName: 'file2.pdf', uploadedAt: '2024-01-02' },
            ];

            (fetch as Mock)
                .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // initial fetch
                .mockResolvedValueOnce({ ok: true }); // delete

            const { result } = renderHook(() =>
                useApproval('node-1', { initialDeliverables })
            );

            await waitFor(() => expect(fetch).toHaveBeenCalled());

            await act(async () => {
                await result.current.deleteDeliverable('d1');
            });

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/api/approval/node-1/deliverables/d1'),
                expect.objectContaining({ method: 'DELETE' })
            );

            // Should have removed from state
            expect(result.current.deliverables).toHaveLength(1);
        });
    });

    describe('clearError', () => {
        it('should clear error state', async () => {
            (fetch as Mock).mockResolvedValue({ ok: true, json: async () => ({}) });

            const { result } = renderHook(() => useApproval('node-1'));

            await waitFor(() => expect(fetch).toHaveBeenCalled());

            // Manually set an error state by rejecting without reason
            await act(async () => {
                await result.current.reject('');
            });

            expect(result.current.error).toBe('请填写驳回原因');

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });
});
