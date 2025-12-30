/**
 * Story 7.5: Archive API Service
 * Centralized API calls for archive-related operations
 *
 * Refactoring:
 * - Extracted from ArchiveDrawer.tsx direct fetch calls (3 instances)
 */

import type { SearchResultItem } from '@cdm/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface FetchArchivedNodesParams {
    graphId?: string;
}

export interface FetchArchivedNodesResult {
    results: SearchResultItem[];
}

/**
 * Fetch all archived nodes, optionally filtered by graph
 */
export async function fetchArchivedNodes(
    params?: FetchArchivedNodesParams
): Promise<SearchResultItem[]> {
    try {
        const queryParams = new URLSearchParams();
        if (params?.graphId) {
            queryParams.set('graphId', params.graphId);
        }

        const response = await fetch(
            `${API_BASE_URL}/api/nodes/archived?${queryParams.toString()}`
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch archived nodes: ${response.status}`);
        }

        const data: FetchArchivedNodesResult = await response.json();
        return data.results || [];
    } catch (error) {
        console.error('[archive.api] Error fetching archived nodes:', error);
        throw error;
    }
}

/**
 * Unarchive (restore) a node
 */
export async function unarchiveNode(nodeId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/nodes/${nodeId}:unarchive`, {
        method: 'POST',
    });

    if (!response.ok) {
        throw new Error(`Failed to unarchive node: ${response.status}`);
    }
}

/**
 * Batch unarchive multiple nodes
 */
export async function batchUnarchiveNodes(nodeIds: string[]): Promise<void> {
    await Promise.all(nodeIds.map((id) => unarchiveNode(id)));
}

/**
 * Permanently delete a node
 */
export async function deleteNode(nodeId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/nodes/${nodeId}`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        throw new Error(`Failed to delete node: ${response.status}`);
    }
}

/**
 * Batch delete multiple nodes
 */
export async function batchDeleteNodes(nodeIds: string[]): Promise<void> {
    await Promise.all(nodeIds.map((id) => deleteNode(id)));
}
