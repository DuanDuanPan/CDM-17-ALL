'use client';

/**
 * Story 7.5: Approval Configuration Hook
 * Encapsulates approval workflow configuration
 * Pattern: Follows Story 7.2's useApproval hook structure
 *
 * Used by: WorkflowConfigDialog
 *
 * Features:
 * - Configure approval workflow steps
 * - Loading state
 * - Error handling
 */

import { useState, useCallback } from 'react';
import { configureApprovalWorkflow, type WorkflowStep } from '@/lib/api/approval';

export interface UseApprovalConfigReturn {
    // State
    isSubmitting: boolean;
    error: string | null;

    // Actions
    configure: (nodeId: string, steps: WorkflowStep[]) => Promise<void>;
    clearError: () => void;
}

export function useApprovalConfig(): UseApprovalConfigReturn {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Configure workflow
    const configure = useCallback(async (nodeId: string, steps: WorkflowStep[]) => {
        setIsSubmitting(true);
        setError(null);
        try {
            await configureApprovalWorkflow(nodeId, steps);
        } catch (err) {
            const message = err instanceof Error ? err.message : '配置失败';
            console.error('[useApprovalConfig] Configure failed:', err);
            setError(message);
            throw err;
        } finally {
            setIsSubmitting(false);
        }
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        isSubmitting,
        error,
        configure,
        clearError,
    };
}

export default useApprovalConfig;
