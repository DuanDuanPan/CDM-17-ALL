'use client';

/**
 * Story 2.5: Global Search Dialog (Command Palette)
 * Provides Cmd+K / Ctrl+K global search functionality
 * AC#1.1, AC#1.2, AC#1.3, AC#1.4, AC#3.1, AC#3.2
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Command } from 'cmdk';
import {
    Search,
    FileText,
    CheckCircle,
    Box,
    Database,
    X,
    Circle,
    Loader2,
} from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { useGlobalShortcut, useModifierKey } from '@/hooks/useGlobalShortcut';
import { NodeType } from '@cdm/types';

interface GlobalSearchDialogProps {
    onSelect: (nodeId: string, graphId: string) => void;
    onTagClick?: (tag: string) => void;
    graphId?: string; // Optional: limit search to specific graph
}

/**
 * Node Type Icon Component
 */
function NodeTypeIcon({ type }: { type: NodeType }) {
    const iconClass = 'w-4 h-4';
    switch (type) {
        case NodeType.TASK:
            return <CheckCircle className={`${iconClass} text-emerald-500`} />;
        case NodeType.REQUIREMENT:
            return <FileText className={`${iconClass} text-violet-500`} />;
        case NodeType.PBS:
            return <Box className={`${iconClass} text-sky-500`} />;
        case NodeType.DATA:
            return <Database className={`${iconClass} text-amber-500`} />;
        default:
            return <Circle className={`${iconClass} text-gray-400`} />;
    }
}

/**
 * Global Search Dialog Component
 */
export function GlobalSearchDialog({
    onSelect,
    onTagClick,
    graphId,
}: GlobalSearchDialogProps) {
    const [open, setOpen] = useState(false);
    const { query, setQuery, results, isLoading, reset, isTagSearch, total } =
        useSearch({ graphId });
    const modifierKey = useModifierKey();
    const inputRef = useRef<HTMLInputElement>(null);

    // Cmd+K / Ctrl+K to open
    useGlobalShortcut('k', () => setOpen(true));

    // Handle selection
    const handleSelect = useCallback(
        (nodeId: string, nodeGraphId: string) => {
            setOpen(false);
            reset();
            onSelect(nodeId, nodeGraphId);
        },
        [onSelect, reset]
    );

    // Handle tag click within results
    const handleTagClick = useCallback(
        (tag: string, e: React.MouseEvent) => {
            e.stopPropagation();
            if (onTagClick) {
                onTagClick(tag);
            } else {
                setQuery(`#${tag}`);
            }
        },
        [onTagClick, setQuery]
    );

    // Close on escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                setOpen(false);
                reset();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [open, reset]);

    // Auto-focus input when dialog opens
    useEffect(() => {
        if (open) {
            // Small delay to ensure the input is rendered
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // Story 8.2: Dispatch search results for minimap highlighting (AC: #6)
    useEffect(() => {
        if (!open) {
            // Clear highlights when search closes
            window.dispatchEvent(
                new CustomEvent('mindmap:search-results', {
                    detail: { graphId: graphId || null, nodeIds: [] },
                })
            );
            return;
        }

        // Dispatch current results for highlighting
        const nodeIds = results.map((r) => r.id);
        window.dispatchEvent(
            new CustomEvent('mindmap:search-results', {
                detail: { graphId: graphId || null, nodeIds },
            })
        );
    }, [open, results, graphId]);

    // Open search programmatically (e.g., tag click, toolbar button)
    useEffect(() => {
        const handleOpenSearch = (e: Event) => {
            const event = e as CustomEvent<{ query?: string }>;
            const nextQuery = event.detail?.query;
            setOpen(true);
            if (typeof nextQuery === 'string') {
                setQuery(nextQuery);
            }
        };

        const handleTagSearch = (e: Event) => {
            const event = e as CustomEvent<{ tag?: string }>;
            const tag = event.detail?.tag?.trim();
            if (!tag) return;
            setOpen(true);
            setQuery(`#${tag}`);
        };

        window.addEventListener('mindmap:open-search', handleOpenSearch as EventListener);
        window.addEventListener('mindmap:tag-search', handleTagSearch as EventListener);
        return () => {
            window.removeEventListener('mindmap:open-search', handleOpenSearch as EventListener);
            window.removeEventListener('mindmap:tag-search', handleTagSearch as EventListener);
        };
    }, [setQuery]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => {
                    setOpen(false);
                    reset();
                }}
            />

            {/* Dialog Content */}
            <div className="fixed left-1/2 top-[20vh] -translate-x-1/2 w-[min(640px,90vw)]">
                <Command
                    shouldFilter={false}
                    className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl 
                     rounded-xl border border-gray-200/50 shadow-2xl shadow-black/20
                     overflow-hidden"
                >
                    {/* Search Input */}
                    <div className="flex items-center px-4 py-3 border-b border-gray-200/50">
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 text-gray-400 mr-3 animate-spin" />
                        ) : (
                            <Search className="w-5 h-5 text-gray-400 mr-3" />
                        )}
                        <Command.Input
                            ref={inputRef}
                            data-testid="global-search-input"
                            value={query}
                            onValueChange={setQuery}
                            placeholder={isTagSearch ? '搜索标签...' : '搜索节点...'}
                            className="flex-1 bg-transparent text-base outline-none
                         placeholder:text-gray-400 dark:text-white"
                        />
                        <div className="flex items-center gap-2">
                            <kbd
                                className="hidden sm:inline text-xs text-gray-400 bg-gray-100 
                          dark:bg-gray-800 px-1.5 py-0.5 rounded"
                            >
                                {modifierKey}+K
                            </kbd>
                            <button
                                onClick={() => {
                                    setOpen(false);
                                    reset();
                                }}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>
                    </div>

                    {/* Results List */}
                    <Command.List className="max-h-[360px] overflow-y-auto p-2">
                        {isLoading && (
                            <div className="px-4 py-8 text-center text-gray-400">
                                <div className="animate-pulse">搜索中...</div>
                            </div>
                        )}

                        {!isLoading && results.length === 0 && query && (
                            <Command.Empty className="px-4 py-8 text-center text-gray-400">
                                未找到匹配的节点
                            </Command.Empty>
                        )}

                        {!isLoading && results.length === 0 && !query && (
                            <div className="px-4 py-8 text-center text-gray-400">
                                <p className="text-sm">输入关键字搜索节点</p>
                                <p className="text-xs mt-2 text-gray-300">
                                    使用 <span className="font-mono">#</span> 开头搜索标签
                                </p>
                            </div>
                        )}

                        {results.map((item) => (
                            <Command.Item
                                key={item.id}
                                value={`${item.id}-${item.label}`}
                                onSelect={() => handleSelect(item.id, item.graphId)}
                                className="flex items-start gap-3 px-3 py-2 rounded-lg 
                           cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800
                           data-[selected=true]:bg-blue-50 dark:data-[selected=true]:bg-blue-900/30
                           data-[selected=true]:text-blue-900 dark:data-[selected=true]:text-blue-100"
                            >
                                {/* Type Icon */}
                                <div className="mt-0.5 flex-shrink-0">
                                    <NodeTypeIcon type={item.type} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate dark:text-white">
                                        {item.label}
                                    </div>
                                    {item.description && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                            {item.description}
                                        </div>
                                    )}
                                    {/* Tags */}
                                    {item.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {item.tags.slice(0, 3).map((tag) => (
                                                <button
                                                    key={tag}
                                                    onClick={(e) => handleTagClick(tag, e)}
                                                    className="text-[10px] px-1.5 py-0.5 rounded 
                                     bg-blue-50 text-blue-600 
                                     dark:bg-blue-900/30 dark:text-blue-300
                                     hover:bg-blue-100 dark:hover:bg-blue-900/50
                                     transition-colors"
                                                >
                                                    #{tag}
                                                </button>
                                            ))}
                                            {item.tags.length > 3 && (
                                                <span className="text-[10px] text-gray-400">
                                                    +{item.tags.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Graph Name */}
                                <div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                                    {item.graphName}
                                </div>
                            </Command.Item>
                        ))}
                    </Command.List>

                    {/* Footer */}
                    <div
                        className="flex items-center justify-between px-4 py-2 
                        border-t border-gray-200/50 text-xs text-gray-400"
                    >
                        <span>↑↓ 导航 · ⏎ 选择 · ESC 关闭</span>
                        <span>{results.length > 0 ? `${total} 个结果` : ''}</span>
                    </div>
                </Command>
            </div>
        </div>
    );
}

export default GlobalSearchDialog;
