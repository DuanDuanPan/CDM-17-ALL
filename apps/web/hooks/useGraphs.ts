'use client';

/**
 * useGraphs Hook
 * 管理用户的图谱列表，提供 CRUD 操作
 */

import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface GraphItem {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    projectId: string;
    project: {
        id: string;
        name: string;
    };
    _count?: {
        nodes: number;
        edges: number;
    };
}

export interface UseGraphsReturn {
    graphs: GraphItem[];
    isLoading: boolean;
    error: Error | null;
    createGraph: (name?: string) => Promise<GraphItem>;
    deleteGraph: (graphId: string) => Promise<void>;
    refreshGraphs: () => Promise<void>;
}

export function useGraphs(userId: string): UseGraphsReturn {
    const [graphs, setGraphs] = useState<GraphItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const fetchGraphs = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE_URL}/api/graphs?userId=${userId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch graphs: ${response.statusText}`);
            }
            const data = await response.json();
            setGraphs(data);
        } catch (err) {
            setError(err as Error);
            console.error('Failed to fetch graphs:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    const createGraph = useCallback(
        async (name?: string): Promise<GraphItem> => {
            const response = await fetch(`${API_BASE_URL}/api/graphs?userId=${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name || '新建图谱' }),
            });
            if (!response.ok) {
                throw new Error(`Failed to create graph: ${response.statusText}`);
            }
            const newGraph = await response.json();
            await fetchGraphs(); // 刷新列表
            return newGraph;
        },
        [userId, fetchGraphs]
    );

    const deleteGraph = useCallback(
        async (graphId: string): Promise<void> => {
            const response = await fetch(
                `${API_BASE_URL}/api/graphs/${graphId}?userId=${userId}`,
                { method: 'DELETE' }
            );
            if (!response.ok) {
                throw new Error(`Failed to delete graph: ${response.statusText}`);
            }
            await fetchGraphs(); // 刷新列表
        },
        [userId, fetchGraphs]
    );

    useEffect(() => {
        fetchGraphs();
    }, [fetchGraphs]);

    return {
        graphs,
        isLoading,
        error,
        createGraph,
        deleteGraph,
        refreshGraphs: fetchGraphs,
    };
}
