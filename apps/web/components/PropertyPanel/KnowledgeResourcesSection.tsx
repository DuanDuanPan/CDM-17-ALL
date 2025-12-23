'use client';

/**
 * Story 2.8: Knowledge Resources Section
 * Extracted from TaskForm.tsx for better maintainability
 * Handles knowledge resource association display and management
 */

import { useState } from 'react';
import { BookOpen, Plus, X, FileText, Link as LinkIcon, Video, ExternalLink } from 'lucide-react';
import type { KnowledgeReference } from '@cdm/types';
import { useToast } from '@cdm/ui';
import { KnowledgeSearchDialog } from '@/components/Knowledge';

export interface KnowledgeResourcesSectionProps {
    knowledgeRefs: KnowledgeReference[];
    onKnowledgeRefsChange: (refs: KnowledgeReference[]) => void;
}

/**
 * Get icon component based on knowledge type
 */
function getKnowledgeIcon(type: KnowledgeReference['type']) {
    switch (type) {
        case 'document':
            return <FileText className="w-4 h-4" />;
        case 'link':
            return <LinkIcon className="w-4 h-4" />;
        case 'video':
            return <Video className="w-4 h-4" />;
        default:
            return <FileText className="w-4 h-4" />;
    }
}

export function KnowledgeResourcesSection({
    knowledgeRefs,
    onKnowledgeRefsChange,
}: KnowledgeResourcesSectionProps) {
    const [showKnowledgeSearch, setShowKnowledgeSearch] = useState(false);
    const { addToast } = useToast();

    const handleAddKnowledge = (knowledge: KnowledgeReference) => {
        // Check for duplicates
        if (knowledgeRefs.some((ref) => ref.id === knowledge.id)) {
            addToast({ type: 'warning', title: '提示', description: '该知识资源已关联' });
            return;
        }
        // Add new knowledge reference
        const updatedRefs = [...knowledgeRefs, knowledge];
        onKnowledgeRefsChange(updatedRefs);
        addToast({ type: 'success', title: '关联成功', description: `已关联: ${knowledge.title}` });
    };

    const handleRemoveKnowledge = (id: string) => {
        const updatedRefs = knowledgeRefs.filter((k) => k.id !== id);
        onKnowledgeRefsChange(updatedRefs);
    };

    return (
        <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    📚 关联知识
                </h3>
                <button
                    type="button"
                    onClick={() => setShowKnowledgeSearch(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                    <Plus className="w-3 h-3" />
                    关联
                </button>
            </div>

            {/* Knowledge List */}
            {knowledgeRefs.length > 0 ? (
                <div className="space-y-2">
                    {knowledgeRefs.map((ref) => (
                        <div
                            key={ref.id}
                            className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all group cursor-pointer"
                            onClick={() => {
                                // Open the resource URL in a new tab for preview
                                if (ref.url) {
                                    window.open(ref.url, '_blank', 'noopener,noreferrer');
                                    addToast({
                                        type: 'info',
                                        title: `正在打开: ${ref.title}`,
                                        description: 'PDF文档已在新标签页中打开'
                                    });
                                }
                            }}
                            title={ref.url ? '点击预览PDF' : ref.title}
                        >
                            {/* Icon */}
                            <div className="w-8 h-8 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                                {getKnowledgeIcon(ref.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 line-clamp-1 group-hover:text-blue-700 transition-colors">{ref.title}</p>
                                {ref.summary && (
                                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{ref.summary}</p>
                                )}
                            </div>

                            {/* External Link Indicator + Remove Button */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                                {ref.url && (
                                    <span className="opacity-0 group-hover:opacity-100 text-blue-400 transition-opacity">
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent opening PDF when clicking remove
                                        handleRemoveKnowledge(ref.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded transition-all"
                                    title="移除关联"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-4 text-xs text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    暂无关联知识，点击"关联"添加
                </div>
            )}

            {/* Knowledge Search Dialog */}
            <KnowledgeSearchDialog
                open={showKnowledgeSearch}
                onOpenChange={setShowKnowledgeSearch}
                onSelect={handleAddKnowledge}
            />
        </div>
    );
}
