/**
 * Story 9.9: Asset Filter Bar Types
 * AC3: Search scope selector types
 */

import type { DataAssetFormat } from '@cdm/types';

/**
 * Search scope for asset filtering
 * - current-node: Search within assets linked to the currently selected node(s)
 * - all: Search across all assets in the graph
 * - unlinked: Search assets not linked to any node
 */
export type SearchScope = 'current-node' | 'all' | 'unlinked';

/**
 * Asset filter state interface
 */
export interface AssetFilterState {
    /** Search query for assets */
    assetSearchQuery: string;
    /** Search scope */
    searchScope: SearchScope;
    /** Format filter (empty string means no filter) */
    formatFilter: DataAssetFormat | '';
    /** Date range start (ISO string) */
    createdAfter: string;
    /** Date range end (ISO string) */
    createdBefore: string;
}

/**
 * Default filter state
 */
export const DEFAULT_FILTER_STATE: AssetFilterState = {
    assetSearchQuery: '',
    searchScope: 'current-node',
    formatFilter: '',
    createdAfter: '',
    createdBefore: '',
};

/**
 * Scope option for dropdown
 */
export interface ScopeOption {
    value: SearchScope;
    label: string;
    description: string;
    icon: string;
}

/**
 * Available scope options
 */
export const SCOPE_OPTIONS: ScopeOption[] = [
    {
        value: 'current-node',
        label: '当前节点',
        description: '搜索当前选中节点的关联资产',
        icon: '📍',
    },
    {
        value: 'all',
        label: '全部资产',
        description: '搜索整个图谱的所有资产',
        icon: '🌐',
    },
    {
        value: 'unlinked',
        label: '未关联资产',
        description: '搜索未与任何节点关联的资产',
        icon: '📎',
    },
];
