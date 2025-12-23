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

// Mock recommendation data - 卫星研发领域中文知识推荐 (client-side static list for AC1.2)
const MOCK_RECOMMENDATIONS = [
    {
        id: 'rec_01',
        title: '卫星热控系统设计手册',
        type: 'document' as const,
        reason: '热控设计相关任务推荐',
        url: 'https://ntrs.nasa.gov/api/citations/20210000685/downloads/NASA-SP-8105-REV1.pdf',
    },
    {
        id: 'rec_02',
        title: '姿态轨道控制系统(AOCS)技术指南',
        type: 'document' as const,
        reason: 'AOCS分系统设计参考',
        url: 'https://arxiv.org/pdf/2401.00892.pdf',
    },
    {
        id: 'rec_03',
        title: '卫星可靠性与FMECA分析',
        type: 'document' as const,
        reason: '可靠性设计必读文档',
        url: 'https://ntrs.nasa.gov/api/citations/19930020471/downloads/19930020471.pdf',
    },
    {
        id: 'rec_04',
        title: '空间环境与辐射效应分析',
        type: 'document' as const,
        reason: '环境适应性设计参考',
        url: 'https://arxiv.org/pdf/2303.11000.pdf',
    },
    {
        id: 'rec_05',
        title: '星载软件开发标准ECSS-E-ST-40C',
        type: 'link' as const,
        reason: '软件开发规范',
        url: 'https://ecss.nl/standard/ecss-e-st-40c-software-general-requirements/',
    },
    {
        id: 'rec_06',
        title: '卫星电源分系统设计标准',
        type: 'document' as const,
        reason: '电源系统设计依据',
        url: 'https://ntrs.nasa.gov/api/citations/20180006860/downloads/20180006860.pdf',
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

    // AC1.3: Open PDF preview in new tab when clicking recommendation
    const handleRecommendationClick = (item: typeof MOCK_RECOMMENDATIONS[number]) => {
        // Open the resource in a new tab for preview
        window.open(item.url, '_blank', 'noopener,noreferrer');

        addToast({
            type: 'info',
            title: `正在打开: ${item.title}`,
            description: 'PDF文档已在新标签页中打开',
            duration: 3000,
        });
        console.log(`[Knowledge Recommendation] Opening resource: "${item.title}" - ${item.url}`);
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
                        onClick={() => handleRecommendationClick(item)}
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
