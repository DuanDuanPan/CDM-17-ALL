/**
 * Story 7.5: Knowledge API Service
 * Centralized API calls for knowledge library operations
 *
 * Refactoring:
 * - Extracted from KnowledgeSearchDialog.tsx direct fetch call (1 instance)
 */

import type { KnowledgeReference } from '@cdm/types';

// API base URL - prefer env override, otherwise same-origin /api to avoid invalid URL during preview/dev
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Build a safe absolute URL for the knowledge library endpoint
 */
function buildKnowledgeUrl(searchQuery?: string): string {
    const base = API_BASE_URL.startsWith('http')
        ? API_BASE_URL
        : typeof window !== 'undefined'
            ? `${window.location.origin}${API_BASE_URL}`
            : API_BASE_URL;

    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    const url = new URL('knowledge-library', normalizedBase);

    if (searchQuery?.trim()) {
        url.searchParams.set('q', searchQuery.trim());
    }

    return url.toString();
}

/**
 * Search knowledge library resources
 */
export async function searchKnowledgeResources(
    query?: string
): Promise<KnowledgeReference[]> {
    try {
        const url = buildKnowledgeUrl(query);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch knowledge resources: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[knowledge.api] Error searching knowledge:', error);
        throw error;
    }
}
