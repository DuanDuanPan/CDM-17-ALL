'use client';

/**
 * Story 9.7: Context-Aware Upload Hook
 * Story 9.8: Updated for merged node view (PBS+Task combined)
 * Task 2.1: Determines upload mode and default link type based on organization view context
 *
 * AC2-5: Upload behavior changes based on current view (Node/Folder)
 */

import { useMemo } from 'react';
import type { DataLinkType, NodeType } from '@cdm/types';
import type { OrganizationView } from '../components/OrganizationTabs';

// ========================================
// Types
// ========================================

export type UploadMode = 'folder' | 'node-link' | 'unlinked';

export interface ContextAwareUploadConfig {
    /** Upload mode based on context */
    mode: UploadMode;
    /** Node ID for node-link mode */
    nodeId?: string;
    /** Folder ID for folder mode */
    folderId?: string;
    /** Default link type for node-link mode */
    defaultLinkType?: DataLinkType;
}

export interface UseContextAwareUploadOptions {
    /** Current organization view */
    orgView: OrganizationView;
    /** Story 9.8: Active node ID (from merged node view) */
    activeNodeId?: string | null;
    /** Story 9.8: Node type of active node (PBS or TASK) */
    activeNodeType?: NodeType | null;
    /** Selected Folder ID (null if none) */
    selectedFolderId: string | null;
    // Legacy props for backward compatibility
    /** @deprecated Use activeNodeId instead */
    selectedPbsId?: string | null;
    /** @deprecated Use activeNodeId instead */
    selectedTaskId?: string | null;
}

// ========================================
// Constants
// ========================================

const NODE_TYPE_PBS = 'PBS' as const;
const NODE_TYPE_TASK = 'TASK' as const;

// ========================================
// Hook
// ========================================

/**
 * Hook to determine context-aware upload configuration
 *
 * Story 9.8 update: Merged node view logic
 * - Node view + node selected → node-link mode
 *   - PBS node: default linkType = 'reference'
 *   - TASK node: default linkType = 'output'
 * - Folder view → folder mode
 * - No selection → unlinked mode
 */
export function useContextAwareUpload({
    orgView,
    activeNodeId,
    activeNodeType,
    selectedFolderId,
    // Legacy props
    selectedPbsId,
    selectedTaskId,
}: UseContextAwareUploadOptions): ContextAwareUploadConfig {
    return useMemo(() => {
        // Folder view - direct upload to folder
        if (orgView === 'folder') {
            return {
                mode: 'folder' as const,
                folderId: selectedFolderId ?? undefined,
            };
        }

        // Story 9.8: Merged node view
        if (orgView === 'node') {
            // Prefer new activeNodeId, fallback to legacy props
            const nodeId = activeNodeId ?? selectedPbsId ?? selectedTaskId;

            if (nodeId) {
                // Determine link type based on node type
                let defaultLinkType: DataLinkType = 'reference';

                if (activeNodeType === NODE_TYPE_TASK) {
                    defaultLinkType = 'output';
                }
                // PBS and other types default to 'reference'

                return {
                    mode: 'node-link' as const,
                    nodeId,
                    defaultLinkType,
                };
            }
        }

        // No selection - unlinked mode
        return {
            mode: 'unlinked' as const,
        };
    }, [orgView, activeNodeId, activeNodeType, selectedFolderId, selectedPbsId, selectedTaskId]);
}

export default useContextAwareUpload;

