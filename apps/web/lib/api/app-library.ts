/**
 * Story 7.5: App Library API Service
 * Centralized API calls for app library operations
 *
 * Refactoring:
 * - Extracted from AppLibraryDialog.tsx direct fetch calls (2 instances)
 * - Extracted from AppForm.tsx execute call (1 instance)
 */

import type { AppLibraryEntry, AppInput, AppOutput, AppSourceType } from '@cdm/types';

/**
 * Fetch app library entries with optional search query
 */
export async function fetchAppLibraryEntries(query?: string): Promise<AppLibraryEntry[]> {
    try {
        const params = new URLSearchParams();
        if (query) {
            params.set('q', query);
        }

        const response = await fetch(`/api/app-library?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch app library: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[app-library.api] Error fetching entries:', error);
        throw error;
    }
}

/**
 * Fetch available app categories
 */
export async function fetchAppCategories(): Promise<string[]> {
    try {
        const response = await fetch('/api/app-library/categories');

        if (!response.ok) {
            throw new Error(`Failed to fetch categories: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[app-library.api] Error fetching categories:', error);
        throw error;
    }
}

/**
 * Execute app request payload
 */
export interface ExecuteAppRequest {
    appSourceType: AppSourceType;
    appPath: string | null;
    appUrl: string | null;
    libraryAppId: string | null;
    libraryAppName: string | null;
    inputs: AppInput[];
    outputs: AppOutput[];
}

/**
 * Execute app response
 */
export interface ExecuteAppResponse {
    outputs: AppOutput[];
    error?: string;
    executedAt: string;
}

/**
 * Execute an app for a given node
 */
export async function executeApp(
    nodeId: string,
    request: ExecuteAppRequest
): Promise<ExecuteAppResponse> {
    const response = await fetch(`/api/nodes/${nodeId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error(`执行失败：${response.status}`);
    }

    return await response.json();
}
