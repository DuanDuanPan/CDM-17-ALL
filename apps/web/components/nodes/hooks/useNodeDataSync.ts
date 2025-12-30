'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Node } from '@antv/x6';
import { NodeType, type MindNodeData } from '@cdm/types';
import { getUnreadCount as getGlobalUnreadCount, subscribe as subscribeToUnreadCounts } from '@/lib/commentCountStore';
import { isSubscribed as isNodeSubscribed, subscribe as subscribeToSubscriptionStore } from '@/lib/subscriptionStore';

const DEFAULT_DATA: MindNodeData = {
    id: '',
    label: '',
    description: '',
    isEditing: false,
    isSelected: false,
};

export interface UseNodeDataSyncReturn {
    /** Get current node data */
    getData: () => MindNodeData;
    /** Current editing state */
    isEditing: boolean;
    setIsEditing: (editing: boolean) => void;
    /** Current selection state */
    isSelected: boolean;
    /** Label state */
    label: string;
    setLabel: (label: string) => void;
    /** Description state */
    description: string;
    setDescription: (description: string) => void;
    /** Tags state */
    tags: string[];
    /** APP running state (local only) */
    appRunning: boolean;
    setAppRunning: (running: boolean) => void;
    /** Unread comment count */
    unreadCount: number;
    /** Whether node is watched/subscribed */
    isWatched: boolean;
}

/**
 * Hook to sync node data with X6 and external stores.
 * Story 7.4: Extracted from MindNode for single responsibility.
 */
export function useNodeDataSync(node: Node): UseNodeDataSyncReturn {
    const getData = useCallback((): MindNodeData => {
        return (node?.getData() as MindNodeData) ?? DEFAULT_DATA;
    }, [node]);

    const [isEditing, setIsEditing] = useState(() => !!getData().isEditing);
    const [isSelected, setIsSelected] = useState(() => !!getData().isSelected);
    const [label, setLabel] = useState(() => getData().label ?? '');
    const [description, setDescription] = useState(() => getData().description ?? '');
    const [tags, setTags] = useState<string[]>(() => getData().tags ?? []);
    const [appRunning, setAppRunning] = useState(false);

    // Story 4.3: Unread comment indicator
    const [unreadCount, setUnreadCount] = useState(() => getGlobalUnreadCount(node.id));

    // Story 4.4: Subscription indicator
    const [isWatched, setIsWatched] = useState(() => isNodeSubscribed(node.id));

    // Subscribe to unread count changes
    useEffect(() => {
        const unsubscribe = subscribeToUnreadCounts(() => {
            setUnreadCount(getGlobalUnreadCount(node.id));
        });
        return unsubscribe;
    }, [node.id]);

    // Subscribe to subscription store changes
    useEffect(() => {
        const unsubscribe = subscribeToSubscriptionStore(() => {
            setIsWatched(isNodeSubscribed(node.id));
        });
        return unsubscribe;
    }, [node.id]);

    // Sync state with node data
    useEffect(() => {
        if (!node) return;
        const onDataChange = () => {
            const data = (node.getData() as MindNodeData) ?? DEFAULT_DATA;
            setIsEditing(!!data.isEditing);
            setIsSelected(!!data.isSelected);
            setTags(data.tags ?? []);
            if (data.nodeType !== NodeType.APP) {
                setAppRunning(false);
            }
            if (!data.isEditing) {
                setLabel(data.label ?? '');
                setDescription(data.description ?? '');
            }
        };
        node.on('change:data', onDataChange);
        return () => {
            node.off('change:data', onDataChange);
        };
    }, [node]);

    return {
        getData,
        isEditing,
        setIsEditing,
        isSelected,
        label,
        setLabel,
        description,
        setDescription,
        tags,
        appRunning,
        setAppRunning,
        unreadCount,
        isWatched,
    };
}

export { DEFAULT_DATA };
