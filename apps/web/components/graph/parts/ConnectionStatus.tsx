'use client';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'idle';

export interface ConnectionStatusProps {
    syncStatus: SyncStatus;
}

/**
 * Connection status indicator overlay.
 * Story 7.4: Extracted from GraphComponent for single responsibility.
 */
export function ConnectionStatus({ syncStatus }: ConnectionStatusProps) {
    const statusConfig = {
        synced: {
            bg: 'bg-green-100 text-green-700',
            dot: 'bg-green-500',
            text: '✓ 已与远程同步',
        },
        syncing: {
            bg: 'bg-blue-100 text-blue-700',
            dot: 'bg-blue-500 animate-pulse',
            text: '正在同步...',
        },
        offline: {
            bg: 'bg-yellow-100 text-yellow-700',
            dot: 'bg-yellow-500',
            text: '离线模式',
        },
        idle: {
            bg: 'bg-gray-100 text-gray-500',
            dot: 'bg-gray-400',
            text: '未连接',
        },
    };

    const config = statusConfig[syncStatus];

    return (
        <div
            className={`absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${config.bg}`}
            data-testid="collab-status"
        >
            <span className={`w-2 h-2 rounded-full ${config.dot}`} />
            {config.text}
        </div>
    );
}
