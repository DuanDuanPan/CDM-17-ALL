'use client';

/**
 * Story 2.8: Knowledge Search Dialog
 * Modal dialog for searching and selecting knowledge resources from mock knowledge library
 * Uses cmdk (Command) component pattern from ProductSearchDialog
 * Uses React Portal to escape PropertyPanel container constraints
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Command } from 'cmdk';
import {
    Search,
    X,
    Loader2,
    BookOpen,
    FileText,
    Link as LinkIcon,
    Video,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';
import type { KnowledgeReference } from '@cdm/types';

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface KnowledgeSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (knowledge: KnowledgeReference) => void;
}

// Icon mapping based on knowledge type
function getKnowledgeIcon(type: KnowledgeReference['type']) {
    switch (type) {
        case 'document':
            return <FileText className="w-4 h-4 text-blue-500" />;
        case 'link':
            return <LinkIcon className="w-4 h-4 text-green-500" />;
        case 'video':
            return <Video className="w-4 h-4 text-purple-500" />;
        default:
            return <FileText className="w-4 h-4 text-gray-500" />;
    }
}

// Type badge component
function TypeBadge({ type }: { type: KnowledgeReference['type'] }) {
    const colors: Record<KnowledgeReference['type'], string> = {
        document: 'bg-blue-100 text-blue-700',
        link: 'bg-green-100 text-green-700',
        video: 'bg-purple-100 text-purple-700',
    };

    const labels: Record<KnowledgeReference['type'], string> = {
        document: '文档',
        link: '链接',
        video: '视频',
    };

    return (
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${colors[type]}`}>
            {labels[type]}
        </span>
    );
}

export function KnowledgeSearchDialog({
    open,
    onOpenChange,
    onSelect,
}: KnowledgeSearchDialogProps) {
    const [query, setQuery] = useState('');
    const [debouncedQuery] = useDebounce(query, 300);
    const [results, setResults] = useState<KnowledgeReference[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch knowledge data from API
    const fetchKnowledge = useCallback(async (searchQuery: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const url = new URL(`${API_BASE_URL}/knowledge-library`);
            if (searchQuery.trim()) {
                url.searchParams.set('q', searchQuery.trim());
            }

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error('Failed to fetch knowledge resources');
            }

            const data: KnowledgeReference[] = await response.json();
            setResults(data);
        } catch (err) {
            console.error('Knowledge search error:', err);
            setError('无法加载知识资源');
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch initial results when dialog opens
    useEffect(() => {
        if (open) {
            fetchKnowledge('');
        }
    }, [open, fetchKnowledge]);

    // Re-fetch on debounced query change
    useEffect(() => {
        if (open) {
            fetchKnowledge(debouncedQuery);
        }
    }, [debouncedQuery, open, fetchKnowledge]);

    // Focus input when dialog opens
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open]);

    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            setQuery('');
            setResults([]);
            setError(null);
        }
    }, [open]);

    // Handle close
    const handleClose = useCallback(() => {
        onOpenChange(false);
    }, [onOpenChange]);

    // Handle select
    const handleSelect = useCallback(
        (knowledge: KnowledgeReference) => {
            onSelect(knowledge);
            onOpenChange(false);
        },
        [onSelect, onOpenChange]
    );

    // Handle ESC key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [open, handleClose]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Dialog Panel */}
            <div className="relative w-full max-w-[500px] flex flex-col shadow-2xl shadow-black/20 rounded-xl overflow-hidden">
                <Command
                    shouldFilter={false}
                    className="flex flex-col w-full bg-white border border-gray-200 rounded-xl"
                >
                    {/* Header */}
                    <div className="flex-none px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-blue-500" />
                                关联知识资源
                            </h2>
                            <button
                                onClick={handleClose}
                                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                            ) : (
                                <Search className="w-4 h-4 text-gray-400" />
                            )}
                            <Command.Input
                                ref={inputRef}
                                value={query}
                                onValueChange={setQuery}
                                placeholder="搜索知识资源..."
                                className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                            />
                        </div>
                    </div>

                    {/* Results List */}
                    <Command.List className="max-h-[300px] overflow-y-auto p-2">
                        {error && (
                            <div className="px-4 py-6 text-center text-sm text-red-500">
                                {error}
                            </div>
                        )}

                        {!error && results.length === 0 && !isLoading && (
                            <div className="px-4 py-6 text-center text-sm text-gray-500">
                                未找到相关知识资源
                            </div>
                        )}

                        {!error && results.length > 0 && (
                            <Command.Group>
                                {results.map((item) => (
                                    <Command.Item
                                        key={item.id}
                                        value={item.id}
                                        onSelect={() => handleSelect(item)}
                                        className="flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-blue-50 hover:bg-gray-50 transition-colors group"
                                    >
                                        {/* Icon */}
                                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-md bg-gray-100 group-aria-selected:bg-blue-100">
                                            {getKnowledgeIcon(item.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-800 line-clamp-1 group-aria-selected:text-blue-700">
                                                    {item.title}
                                                </span>
                                                <TypeBadge type={item.type} />
                                            </div>
                                            {item.summary && (
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                                                    {item.summary}
                                                </p>
                                            )}
                                        </div>
                                    </Command.Item>
                                ))}
                            </Command.Group>
                        )}
                    </Command.List>

                    {/* Footer hint */}
                    <div className="flex-none px-4 py-2 border-t border-gray-100 bg-gray-50/50">
                        <p className="text-[10px] text-gray-400 text-center">
                            选择知识资源关联到任务 · 按 ESC 取消
                        </p>
                    </div>
                </Command>
            </div>
        </div>,
        document.body
    );
}
