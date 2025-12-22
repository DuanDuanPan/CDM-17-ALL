/**
 * Story 2.8: Mock Knowledge Library Controller
 * Provides mock knowledge resource data for Task node knowledge linking
 * 
 * Note: This is a mock implementation. Real knowledge base integration is scheduled for Epic 5.
 */
import { Controller, Get, Query } from '@nestjs/common';
import type { KnowledgeReference } from '@cdm/types';

// Mock knowledge data (hardcoded for MVP)
const MOCK_KNOWLEDGE: KnowledgeReference[] = [
    {
        id: 'kb_01',
        title: 'Design Guidelines 2024',
        type: 'document',
        url: '/docs/design-guidelines-2024.pdf',
        summary: 'Company-wide design standards and best practices'
    },
    {
        id: 'kb_02',
        title: 'API Documentation v3',
        type: 'link',
        url: 'https://api.example.com/docs',
        summary: 'API reference documentation for backend services'
    },
    {
        id: 'kb_03',
        title: 'React Best Practices',
        type: 'link',
        url: 'https://react.dev/learn',
        summary: 'Official React documentation and patterns'
    },
    {
        id: 'kb_04',
        title: 'System Architecture Overview',
        type: 'document',
        url: '/docs/architecture-overview.pdf',
        summary: 'High-level system architecture and component diagrams'
    },
    {
        id: 'kb_05',
        title: 'Onboarding Tutorial',
        type: 'video',
        url: '/videos/onboarding-tutorial.mp4',
        summary: 'New team member onboarding video guide'
    },
    {
        id: 'kb_06',
        title: 'Testing Strategy Guide',
        type: 'document',
        url: '/docs/testing-strategy.pdf',
        summary: 'Unit, integration, and E2E testing guidelines'
    },
    {
        id: 'kb_07',
        title: 'Code Review Checklist',
        type: 'document',
        url: '/docs/code-review-checklist.pdf',
        summary: 'Standardized code review criteria and process'
    },
    {
        id: 'kb_08',
        title: 'Database Schema Reference',
        type: 'link',
        url: 'https://wiki.example.com/db-schema',
        summary: 'Complete database schema documentation with ERD'
    },
    {
        id: 'kb_09',
        title: 'Security Best Practices',
        type: 'document',
        url: '/docs/security-guidelines.pdf',
        summary: 'Security standards and vulnerability prevention'
    },
    {
        id: 'kb_10',
        title: 'Performance Optimization Video',
        type: 'video',
        url: '/videos/perf-optimization.mp4',
        summary: 'Frontend and backend performance tuning techniques'
    },
];

@Controller('knowledge-library')
export class KnowledgeLibraryController {
    /**
     * GET /api/knowledge-library
     * Returns list of mock knowledge resources, optionally filtered by search query
     *
     * @param q - Optional search query (filters by title or summary)
     * @returns Array of matching knowledge references
     */
    @Get()
    searchKnowledge(@Query('q') q?: string): KnowledgeReference[] {
        if (!q || q.trim() === '') {
            return MOCK_KNOWLEDGE;
        }

        const query = q.toLowerCase().trim();

        return MOCK_KNOWLEDGE.filter(
            (item) =>
                item.title.toLowerCase().includes(query) ||
                (item.summary && item.summary.toLowerCase().includes(query)) ||
                item.type.toLowerCase().includes(query)
        );
    }
}
