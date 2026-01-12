'use client';

/**
 * Story 2.8: TaskForm Knowledge Association Unit Tests
 * Tests for knowledge resource association in TaskForm
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskForm } from '@/components/PropertyPanel/TaskForm';
import { UserProvider } from '@/contexts';
import type { TaskProps, KnowledgeReference } from '@cdm/types';

// Mock useToast hook - use importOriginal to preserve other exports like Badge, Button
vi.mock('@cdm/ui', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@cdm/ui')>();
    return {
        ...actual,
        useToast: () => ({
            addToast: vi.fn(),
        }),
    };
});

// Mock Story 9.5 linked assets section dependencies (TaskForm now renders it)
vi.mock('@/features/data-library/hooks/useAssetLinks', () => ({
    useAssetLinks: () => ({
        links: [],
        isLoading: false,
        unlinkAsset: vi.fn(),
    }),
}));

// Mock KnowledgeSearchDialog
vi.mock('@/components/Knowledge', () => ({
    KnowledgeSearchDialog: ({ open, onOpenChange, onSelect }: {
        open: boolean;
        onOpenChange: (open: boolean) => void;
        onSelect: (knowledge: KnowledgeReference) => void;
    }) => open ? (
        <div data-testid="knowledge-search-dialog">
            <button
                data-testid="select-knowledge-btn"
                onClick={() => {
                    onSelect({
                        id: 'kb_01',
                        title: 'Test Knowledge',
                        type: 'document',
                        url: '/docs/test.pdf',
                        summary: 'Test summary',
                    });
                    onOpenChange(false);
                }}
            >
                Select Knowledge
            </button>
            <button data-testid="close-dialog-btn" onClick={() => onOpenChange(false)}>
                Close
            </button>
        </div>
    ) : null,
}));

describe('TaskForm - Knowledge Association (Story 2.8)', () => {
    const mockOnUpdate = vi.fn();
    const defaultNodeId = 'test-node-123';
    const testUser = { id: 'user-1', name: '测试用户' };

    beforeEach(() => {
        mockOnUpdate.mockClear();
    });

    describe('AC2.1: Action Entry', () => {
        it('renders "Associate Knowledge" section with add button', () => {
            render(
                <UserProvider initialUser={testUser}>
                    <TaskForm nodeId={defaultNodeId} onUpdate={mockOnUpdate} />
                </UserProvider>
            );

            expect(screen.getByText('📚 关联知识')).toBeTruthy();
            expect(screen.getByText('关联')).toBeTruthy();
        });
    });

    describe('AC2.2: Search Dialog', () => {
        it('opens KnowledgeSearchDialog when clicking add button', () => {
            render(
                <UserProvider initialUser={testUser}>
                    <TaskForm nodeId={defaultNodeId} onUpdate={mockOnUpdate} />
                </UserProvider>
            );

            const addButton = screen.getByText('关联');
            fireEvent.click(addButton);

            expect(screen.getByTestId('knowledge-search-dialog')).toBeTruthy();
        });
    });

    describe('AC2.3: Selection', () => {
        it('adds selected knowledge to knowledgeRefs list', () => {
            render(
                <UserProvider initialUser={testUser}>
                    <TaskForm nodeId={defaultNodeId} onUpdate={mockOnUpdate} />
                </UserProvider>
            );

            // Open dialog
            const addButton = screen.getByText('关联');
            fireEvent.click(addButton);

            // Select knowledge
            const selectBtn = screen.getByTestId('select-knowledge-btn');
            fireEvent.click(selectBtn);

            // Verify onUpdate was called with new knowledge ref
            expect(mockOnUpdate).toHaveBeenCalled();
            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.knowledgeRefs).toHaveLength(1);
            expect(lastCall.knowledgeRefs[0].id).toBe('kb_01');
            expect(lastCall.knowledgeRefs[0].title).toBe('Test Knowledge');
        });
    });

    describe('AC2.4: List Display', () => {
        it('renders knowledgeRefs list with title and remove button', () => {
            const initialData: TaskProps = {
                status: 'todo',
                knowledgeRefs: [
                    { id: 'kb_01', title: 'Design Guidelines', type: 'document', summary: 'Design docs' },
                    { id: 'kb_02', title: 'API Docs', type: 'link', url: 'https://api.example.com' },
                ],
            };

            render(
                <UserProvider initialUser={testUser}>
                    <TaskForm nodeId={defaultNodeId} initialData={initialData} onUpdate={mockOnUpdate} />
                </UserProvider>
            );

            expect(screen.getByText('Design Guidelines')).toBeTruthy();
            expect(screen.getByText('Design docs')).toBeTruthy();
            expect(screen.getByText('API Docs')).toBeTruthy();
        });

        it('removes knowledge reference when clicking remove button', () => {
            const initialData: TaskProps = {
                status: 'todo',
                knowledgeRefs: [
                    { id: 'kb_01', title: 'Design Guidelines', type: 'document' },
                    { id: 'kb_02', title: 'API Docs', type: 'link' },
                ],
            };

            render(
                <UserProvider initialUser={testUser}>
                    <TaskForm nodeId={defaultNodeId} initialData={initialData} onUpdate={mockOnUpdate} />
                </UserProvider>
            );

            // Find and click remove button (there should be 2 remove buttons)
            const removeButtons = screen.getAllByTitle('移除关联');
            expect(removeButtons).toHaveLength(2);

            fireEvent.click(removeButtons[0]);

            // Verify onUpdate was called with updated refs
            expect(mockOnUpdate).toHaveBeenCalled();
            const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
            expect(lastCall.knowledgeRefs).toHaveLength(1);
            expect(lastCall.knowledgeRefs[0].id).toBe('kb_02');
        });

        it('shows empty state when no knowledge refs', () => {
            render(
                <UserProvider initialUser={testUser}>
                    <TaskForm nodeId={defaultNodeId} onUpdate={mockOnUpdate} />
                </UserProvider>
            );

            expect(screen.getByText(/暂无关联知识/)).toBeTruthy();
        });
    });

    describe('Icon rendering based on type', () => {
        it('renders correct icons for different knowledge types', () => {
            const initialData: TaskProps = {
                status: 'todo',
                knowledgeRefs: [
                    { id: 'kb_01', title: 'Document', type: 'document' },
                    { id: 'kb_02', title: 'Link', type: 'link' },
                    { id: 'kb_03', title: 'Video', type: 'video' },
                ],
            };

            render(
                <UserProvider initialUser={testUser}>
                    <TaskForm nodeId={defaultNodeId} initialData={initialData} onUpdate={mockOnUpdate} />
                </UserProvider>
            );

            // All three items should be rendered
            expect(screen.getByText('Document')).toBeTruthy();
            expect(screen.getByText('Link')).toBeTruthy();
            expect(screen.getByText('Video')).toBeTruthy();
        });
    });
});
