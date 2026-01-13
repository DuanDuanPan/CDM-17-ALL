'use client';

/**
 * Story 9.7: Grouped Asset List Component
 * Task 1.1: Display assets grouped by linkType (input/output/reference)
 *
 * AC1: PBS/任务视图点击节点后右侧按关联类型分组显示资产
 */

import { useState, useMemo, useCallback } from 'react';
import { Download, Upload, Paperclip, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { Badge, cn } from '@cdm/ui';
import { AssetCard } from './AssetCard';
import type { NodeDataLinkWithAsset, DataLinkType, DataAssetWithFolder } from '@cdm/types';

// ========================================
// Types
// ========================================

interface GroupedAssetListProps {
    /** Links with asset details from useAssetLinks */
    links: NodeDataLinkWithAsset[];
    /** Callback when preview button clicked (Story 9.3) */
    onAssetPreview?: (asset: DataAssetWithFolder) => void;
    /** Callback when link button clicked (Story 9.5) */
    onAssetLink?: (asset: DataAssetWithFolder) => void;
    /** Story 9.8: Delete callback */
    onAssetDelete?: (asset: DataAssetWithFolder) => void;
    /** Story 9.8: Selection support */
    selectable?: boolean;
    selectedIds?: Set<string>;
    onAssetSelectChange?: (asset: DataAssetWithFolder, selected: boolean) => void;
}

interface LinkTypeConfig {
    type: DataLinkType;
    label: string;
    icon: typeof Download;
    headerClass: string;
}

// ========================================
// Constants
// ========================================

const LINK_TYPE_CONFIGS: LinkTypeConfig[] = [
    {
        type: 'input',
        label: '输入',
        icon: Download,
        headerClass: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    },
    {
        type: 'output',
        label: '输出',
        icon: Upload,
        headerClass: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    {
        type: 'reference',
        label: '参考',
        icon: Paperclip,
        headerClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
];

// ========================================
// Component
// ========================================

/**
 * GroupedAssetList - Display assets grouped by linkType
 * AC1: 数据资产应按关联类型分组显示：输入(Input) / 输出(Output) / 参考(Reference)
 */
export function GroupedAssetList({
    links,
    onAssetPreview,
    onAssetLink,
    onAssetDelete,
    selectable,
    selectedIds,
    onAssetSelectChange,
}: GroupedAssetListProps) {
    // State: which groups are collapsed
    const [collapsedGroups, setCollapsedGroups] = useState<Set<DataLinkType>>(new Set());
    // State: show empty groups toggle
    const [showEmptyGroups, setShowEmptyGroups] = useState(false);

    // Group links by linkType
    const groupedLinks = useMemo(() => {
        const groups: Record<DataLinkType, NodeDataLinkWithAsset[]> = {
            input: [],
            output: [],
            reference: [],
        };

        for (const link of links) {
            const type = link.linkType || 'reference'; // fallback to reference
            groups[type].push(link);
        }

        return groups;
    }, [links]);

    // Toggle group collapse
    const toggleGroup = useCallback((type: DataLinkType) => {
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(type)) {
                next.delete(type);
            } else {
                next.add(type);
            }
            return next;
        });
    }, []);

    // Toggle show empty groups
    const handleToggleEmptyGroups = useCallback(() => {
        setShowEmptyGroups((prev) => !prev);
    }, []);

    return (
        <div className="flex flex-col gap-2">
            {/* Toolbar: Show Empty Groups Toggle */}
            <div className="flex justify-end mb-2">
                <button
                    type="button"
                    role="switch"
                    aria-pressed={showEmptyGroups}
                    aria-label={showEmptyGroups ? '隐藏空分组' : '显示空分组'}
                    onClick={handleToggleEmptyGroups}
                    data-testid="toggle-empty-groups"
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors',
                        showEmptyGroups
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    )}
                >
                    {showEmptyGroups ? (
                        <Eye className="w-3.5 h-3.5" />
                    ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                    )}
                    <span>{showEmptyGroups ? '隐藏空分组' : '显示空分组'}</span>
                </button>
            </div>

            {/* Grouped Sections */}
            {LINK_TYPE_CONFIGS.map((config) => {
                const groupLinks = groupedLinks[config.type];
                const count = groupLinks.length;
                const isCollapsed = collapsedGroups.has(config.type);
                const isEmpty = count === 0;

                // Hide empty groups unless showEmptyGroups is enabled
                if (isEmpty && !showEmptyGroups) {
                    return null;
                }

                const Icon = config.icon;

                return (
                    <div
                        key={config.type}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                        data-testid={`group-${config.type}`}
                    >
                        {/* Group Header */}
                        <button
                            type="button"
                            onClick={() => toggleGroup(config.type)}
                            className={cn(
                                'w-full flex items-center justify-between px-4 py-3 transition-colors',
                                config.headerClass
                            )}
                            data-testid={`group-header-${config.type}`}
                        >
                            <div className="flex items-center gap-2">
                                {isCollapsed ? (
                                    <ChevronRight className="w-4 h-4" />
                                ) : (
                                    <ChevronDown className="w-4 h-4" />
                                )}
                                <Icon className="w-4 h-4" />
                                <span className="font-medium text-sm">{config.label}</span>
                            </div>
                            <Badge
                                variant={count > 0 ? 'default' : 'secondary'}
                                className="min-w-[24px] justify-center"
                            >
                                {count}
                            </Badge>
                        </button>

                        {/* Group Content */}
                        {!isCollapsed && (
                            <div
                                className="p-4 bg-white dark:bg-gray-900"
                                data-testid={`group-content-${config.type}`}
                            >
                                {isEmpty ? (
                                    <div className="text-center text-sm text-gray-400 py-6">
                                        暂无{config.label}资产
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {groupLinks.map((link) => (
                                            <AssetCard
                                                key={link.id}
                                                asset={link.asset}
                                                onPreview={onAssetPreview ? () => onAssetPreview(link.asset) : undefined}
                                                onLink={onAssetLink ? () => onAssetLink(link.asset) : undefined}
                                                onDelete={onAssetDelete ? () => onAssetDelete(link.asset) : undefined}
                                                selectable={selectable}
                                                selected={!!selectedIds?.has(link.asset.id)}
                                                onSelectChange={
                                                    onAssetSelectChange
                                                        ? (selected) => onAssetSelectChange(link.asset, selected)
                                                        : undefined
                                                }
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Empty state when all groups are empty */}
            {links.length === 0 && (
                <div className="text-center text-sm text-gray-400 py-10">
                    该节点暂无关联资产
                </div>
            )}
        </div>
    );
}

export default GroupedAssetList;
