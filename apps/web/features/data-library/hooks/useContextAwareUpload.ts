'use client';

/**
 * Story 9.7: Context-Aware Upload Hook
 * Task 2.1: Determines upload mode and default link type based on organization view context
 *
 * AC2-5: Upload behavior changes based on current view (PBS/Task/Folder)
 */

import { useMemo } from 'react';
import type { DataLinkType } from '@cdm/types';
import type { OrganizationView } from '../components/OrganizationTabs';

// ========================================
// Types
// ========================================

export type UploadMode = 'folder' | 'node-link' | 'unlinked';

export interface ContextAwareUploadConfig {
    /** Upload mode based on context */
    mode: UploadMode;
    /** Node ID for node-link mode (PBS or Task ID) */
    nodeId?: string;
    /** Folder ID for folder mode */
    folderId?: string;
    /** Default link type for node-link mode */
    defaultLinkType?: DataLinkType;
}

export interface UseContextAwareUploadOptions {
    /** Current organization view */
    orgView: OrganizationView;
    /** Selected PBS node ID (null if none) */
    selectedPbsId: string | null;
    /** Selected Task node ID (null if none) */
    selectedTaskId: string | null;
    /** Selected Folder ID (null if none) */
    selectedFolderId: string | null;
}

// ========================================
// Hook
// ========================================

/**
 * Hook to determine context-aware upload configuration
 *
 * Returns upload mode and configuration based on current organization view:
 * - PBS view + node selected → node-link mode, default linkType = 'reference'
 * - Task view + node selected → node-link mode, default linkType = 'output'
 * - Folder view → folder mode (direct upload to folder)
 * - No selection → unlinked mode
 */
export function useContextAwareUpload({
    orgView,
    selectedPbsId,
    selectedTaskId,
    selectedFolderId,
}: UseContextAwareUploadOptions): ContextAwareUploadConfig {
    return useMemo(() => {
        // AC2: Folder view - direct upload to folder
        if (orgView === 'folder') {
            return {
                mode: 'folder' as const,
                folderId: selectedFolderId ?? undefined,
            };
        }

        // AC3: Task view with node selected - output link
        if (orgView === 'task' && selectedTaskId) {
            return {
                mode: 'node-link' as const,
                nodeId: selectedTaskId,
                defaultLinkType: 'output' as const,
            };
        }

        // AC4: PBS view with node selected - reference link
        if (orgView === 'pbs' && selectedPbsId) {
            return {
                mode: 'node-link' as const,
                nodeId: selectedPbsId,
                defaultLinkType: 'reference' as const,
            };
        }

        // AC5: No selection - unlinked mode
        return {
            mode: 'unlinked' as const,
        };
    }, [orgView, selectedPbsId, selectedTaskId, selectedFolderId]);
}

export default useContextAwareUpload;
