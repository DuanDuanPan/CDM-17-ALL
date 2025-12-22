'use client';

/**
 * Story 2.8: Knowledge Recommendation Component
 * Displays mock AI-powered knowledge recommendations at the bottom of the PropertyPanel
 * 
 * Note: This is a mock implementation. Real AI recommendation engine is scheduled for Epic 5.
 */

import { useMemo } from 'react';
import { Sparkles, BookOpen, FileText, Link as LinkIcon, Video, ExternalLink } from 'lucide-react';
import { useToast } from '@cdm/ui';

// Mock recommendation data (client-side static list for AC1.2)
const MOCK_RECOMMENDATIONS = [
    {
        id: 'rec_01',
        title: 'React Best Practices',
        type: 'link' as const,
        reason: 'Based on "Architecture" tag',
    },
    {
        id: 'rec_02',
        title: 'System Design Patterns',
        type: 'document' as const,
        reason: 'Frequently used in Epic-2',
    },
    {
        id: 'rec_03',
        title: 'API Design Guidelines',
        type: 'document' as const,
        reason: 'Related to current task',
    },
    {
        id: 'rec_04',
        title: 'Testing Strategy Video',
        type: 'video' as const,
        reason: 'Recommended for new features',
    },
    {
        id: 'rec_05',
        title: 'Security Checklist',
        type: 'document' as const,
        reason: 'Best practice reminder',
    },
];

// Icon mapping based on type
function getTypeIcon(type: 'document' | 'link' | 'video') {
    switch (type) {
        case 'document':
            return <FileText className="w-3.5 h-3.5 text-gray-500" />;
        case 'link':
            return <LinkIcon className="w-3.5 h-3.5 text-gray-500" />;
        case 'video':
            return <Video className="w-3.5 h-3.5 text-gray-500" />;
        default:
            return <BookOpen className="w-3.5 h-3.5 text-gray-500" />;
    }
}

export interface KnowledgeRecommendationProps {
    nodeId?: string;
    nodeTitle?: string;
}

export function KnowledgeRecommendation({
    nodeId,
    nodeTitle,
}: KnowledgeRecommendationProps) {
    const { addToast } = useToast();

    // Generate pseudo-random recommendations based on nodeId
    // AC1.2: Display mock recommended resources
    const recommendations = useMemo(() => {
        if (!nodeId) return MOCK_RECOMMENDATIONS.slice(0, 3);

        // Simple hash to generate deterministic but varied results
        const hash = nodeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const startIndex = hash % MOCK_RECOMMENDATIONS.length;

        // Get 3 recommendations starting from pseudo-random index
        const result = [];
        for (let i = 0; i < 3; i++) {
            const index = (startIndex + i) % MOCK_RECOMMENDATIONS.length;
            result.push(MOCK_RECOMMENDATIONS[index]);
        }

        return result;
    }, [nodeId]);

    // AC1.3: Interactive Mock - show toast when clicking recommendation
    const handleRecommendationClick = (title: string) => {
        addToast({
            type: 'info',
            title: `Mock: 打开资源 "${title}"`,
            description: '这是模拟功能，真实知识库集成将在 Epic 5 中实现',
            duration: 3000,
        });
        console.log(`[Knowledge Recommendation] Mock: Open Resource - "${title}"`);
    };

    return (
        <div
            className="mt-6 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 p-4 backdrop-blur-sm"
            data-testid="knowledge-recommendation"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-500">
                    🧠 知识推荐 (Beta)
                </span>
            </div>

            {/* Recommendation List */}
            <div className="space-y-2">
                {recommendations.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleRecommendationClick(item.title)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-white/60 hover:bg-white border border-transparent hover:border-indigo-100 cursor-pointer transition-all text-left group"
                    >
                        {/* Icon */}
                        <div className="flex-shrink-0">
                            {getTypeIcon(item.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-700 font-medium line-clamp-1">
                                {item.title}
                            </div>
                            <div className="text-[10px] text-indigo-400 mt-0.5">
                                {item.reason}
                            </div>
                        </div>

                        {/* External link indicator */}
                        <ExternalLink className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                ))}
            </div>

            {/* Footer hint */}
            <p className="text-[9px] text-indigo-300 text-center mt-3">
                AI 驱动的智能推荐 · Mock 实现
            </p>
        </div>
    );
}
