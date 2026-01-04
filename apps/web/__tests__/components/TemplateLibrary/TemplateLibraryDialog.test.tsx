/**
 * Story 5.1: Template Library
 * Component tests for TemplateLibraryDialog
 * Tests UI interactions for template selection and creation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateLibraryDialog } from '@/components/TemplateLibrary/TemplateLibraryDialog';

// Mock the useTemplates hook
const { mockUseTemplates } = vi.hoisted(() => ({
    mockUseTemplates: vi.fn(),
}));
const mockLoadTemplates = vi.fn();
const mockLoadCategories = vi.fn();
const mockLoadTemplate = vi.fn();
const mockInstantiate = vi.fn();
const mockClearSelectedTemplate = vi.fn();
const mockClearError = vi.fn();

vi.mock('@/hooks/useTemplates', () => ({
    useTemplates: mockUseTemplates,
}));

describe('TemplateLibraryDialog', () => {
    const defaultProps = {
        open: true,
        onOpenChange: vi.fn(),
        onSelect: vi.fn(),
        userId: 'test1',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseTemplates.mockReturnValue({
            templates: [
                {
                    id: 'tpl-1',
                    name: '敏捷研发管理',
                    description: '适用于敏捷开发团队',
                    categoryName: '项目管理',
                    categoryIcon: 'Kanban',
                    defaultClassification: 'internal',
                    usageCount: 42,
                },
                {
                    id: 'tpl-2',
                    name: '故障复盘',
                    description: '用于故障分析',
                    categoryName: '问题分析',
                    categoryIcon: 'Search',
                    defaultClassification: 'confidential',
                    usageCount: 18,
                },
            ],
            categories: [
                { id: 'cat-1', name: '项目管理', sortOrder: 1 },
                { id: 'cat-2', name: '问题分析', sortOrder: 2 },
            ],
            selectedTemplate: null,
            isLoading: false,
            isLoadingTemplate: false,
            isInstantiating: false,
            error: null,
            loadTemplates: mockLoadTemplates,
            loadCategories: mockLoadCategories,
            loadTemplate: mockLoadTemplate,
            instantiate: mockInstantiate,
            clearSelectedTemplate: mockClearSelectedTemplate,
            clearError: mockClearError,
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Dialog rendering', () => {
        // TC-UI-1: Dialog opens and closes correctly
        it('TC-UI-1: renders dialog when open=true', () => {
            render(<TemplateLibraryDialog {...defaultProps} />);

            expect(screen.getByText('模板库')).toBeTruthy();
        });

        it('TC-UI-1: does not render when open=false', () => {
            render(<TemplateLibraryDialog {...defaultProps} open={false} />);

            expect(screen.queryByText('模板库')).toBeNull();
        });

        it('TC-UI-1: calls onOpenChange when close button clicked', async () => {
            const user = userEvent.setup();
            render(<TemplateLibraryDialog {...defaultProps} />);

            const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
            await user.click(closeButton);

            expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
        });

        it('TC-UI-1: calls onOpenChange when cancel button clicked', async () => {
            const user = userEvent.setup();
            render(<TemplateLibraryDialog {...defaultProps} />);

            const cancelButton = screen.getByRole('button', { name: '取消' });
            await user.click(cancelButton);

            expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
        });
    });

    describe('Template list rendering', () => {
        // TC-UI-2: Template list renders correctly
        it('TC-UI-2: renders template list with name and description', () => {
            render(<TemplateLibraryDialog {...defaultProps} />);

            expect(screen.getByText('敏捷研发管理')).toBeTruthy();
            expect(screen.getByText('适用于敏捷开发团队')).toBeTruthy();
            expect(screen.getByText('故障复盘')).toBeTruthy();
            expect(screen.getByText('用于故障分析')).toBeTruthy();
        });

        it('TC-UI-2: displays usage count for templates', () => {
            render(<TemplateLibraryDialog {...defaultProps} />);

            expect(screen.getByText('使用 42 次')).toBeTruthy();
            expect(screen.getByText('使用 18 次')).toBeTruthy();
        });

        it('TC-UI-2: displays category name for templates', () => {
            render(<TemplateLibraryDialog {...defaultProps} />);

            expect(screen.getAllByText('项目管理').length).toBeGreaterThan(0);
            expect(screen.getAllByText('问题分析').length).toBeGreaterThan(0);
        });
    });

    describe('Category filtering', () => {
        // TC-UI-4: Category buttons switch correctly
        it('TC-UI-4: renders category filter buttons', () => {
            render(<TemplateLibraryDialog {...defaultProps} />);

            expect(screen.getByRole('button', { name: '全部' })).toBeTruthy();
            expect(screen.getAllByRole('button', { name: '项目管理' })[0]).toBeTruthy();
            expect(screen.getAllByRole('button', { name: '问题分析' })[0]).toBeTruthy();
        });

        it('TC-UI-4: clicking category button triggers filter', async () => {
            const user = userEvent.setup();
            render(<TemplateLibraryDialog {...defaultProps} />);

            // Find the category button in the filter section (first instance)
            const categoryButtons = screen.getAllByRole('button', { name: '项目管理' });
            await user.click(categoryButtons[0]);

            // Should trigger loadTemplates with the category
            await waitFor(() => {
                expect(mockLoadTemplates).toHaveBeenCalled();
            });
        });
    });

    describe('Template selection', () => {
        // TC-UI-5: Clicking template shows preview
        it('TC-UI-5: selecting template loads template details', async () => {
            const user = userEvent.setup();
            render(<TemplateLibraryDialog {...defaultProps} />);

            // Click on the first template
            const templateButton = screen.getByText('敏捷研发管理');
            await user.click(templateButton);

            expect(mockLoadTemplate).toHaveBeenCalledWith('tpl-1', 'test1');
        });

        // TC-UI-6: Confirm button is disabled when no template selected
        it('TC-UI-6: confirm button is disabled when no template selected', () => {
            render(<TemplateLibraryDialog {...defaultProps} />);

            const confirmButton = screen.getByRole('button', { name: /从模板创建/i });
            expect((confirmButton as HTMLButtonElement).disabled).toBe(true);
        });

        // TC-UI-7: Confirm button is enabled after selecting template
        it('TC-UI-7: confirm button is enabled after selecting template', async () => {
            const user = userEvent.setup();
            render(<TemplateLibraryDialog {...defaultProps} />);

            // Click on a template
            const templateButton = screen.getByText('敏捷研发管理');
            await user.click(templateButton);

            const confirmButton = screen.getByRole('button', { name: /从模板创建/i });
            expect((confirmButton as HTMLButtonElement).disabled).toBe(false);
        });
    });

    describe('Search functionality', () => {
        // TC-UI-3: Search input has debounce behavior
        it('TC-UI-3: renders search input', () => {
            render(<TemplateLibraryDialog {...defaultProps} />);

            const searchInput = screen.getByPlaceholderText('搜索模板名称或描述...');
            expect(searchInput).toBeTruthy();
        });

        it('TC-UI-3: search triggers loadTemplates with debounce', () => {
            vi.useFakeTimers();
            render(<TemplateLibraryDialog {...defaultProps} />);
            mockLoadTemplates.mockClear();

            const searchInput = screen.getByPlaceholderText('搜索模板名称或描述...');
            fireEvent.change(searchInput, { target: { value: 'agile' } });
            vi.advanceTimersByTime(350);

            expect(mockLoadTemplates).toHaveBeenCalledWith(
                expect.objectContaining({
                    search: 'agile',
                })
            );
        });
    });

    describe('Template creation', () => {
        // TC-UI-8: Clicking confirm triggers instantiate
        it('TC-UI-8: clicking confirm button triggers instantiate', async () => {
            const user = userEvent.setup();
            mockInstantiate.mockResolvedValue({
                graphId: 'new-graph-123',
                graphName: '敏捷研发管理',
                nodeCount: 5,
            });

            render(<TemplateLibraryDialog {...defaultProps} />);

            // Select a template
            const templateButton = screen.getByText('敏捷研发管理');
            await user.click(templateButton);

            // Click confirm
            const confirmButton = screen.getByRole('button', { name: /从模板创建/i });
            await user.click(confirmButton);

            await waitFor(() => {
                expect(mockInstantiate).toHaveBeenCalledWith(
                    'tpl-1',
                    defaultProps.userId,
                    expect.anything() // potentially the custom name
                );
            });
        });

        it('TC-UI-8: calls onSelect after successful instantiation', async () => {
            const user = userEvent.setup();
            const mockResponse = {
                graphId: 'new-graph-123',
                graphName: '敏捷研发管理',
                nodeCount: 5,
            };
            mockInstantiate.mockResolvedValue(mockResponse);

            render(<TemplateLibraryDialog {...defaultProps} />);

            // Select and create
            await user.click(screen.getByText('敏捷研发管理'));
            await user.click(screen.getByRole('button', { name: /从模板创建/i }));

            await waitFor(() => {
                expect(defaultProps.onSelect).toHaveBeenCalledWith(mockResponse);
            });
        });
    });

    describe('Loading states', () => {
        // TC-UI-9: Loading state displays correctly
        it('TC-UI-9: shows loading indicator when isLoading is true', () => {
            mockUseTemplates.mockReturnValue({
                templates: [],
                categories: [],
                selectedTemplate: null,
                isLoading: true,
                isLoadingTemplate: false,
                isInstantiating: false,
                error: null,
                loadTemplates: mockLoadTemplates,
                loadCategories: mockLoadCategories,
                loadTemplate: mockLoadTemplate,
                instantiate: mockInstantiate,
                clearSelectedTemplate: mockClearSelectedTemplate,
                clearError: mockClearError,
            });

            render(<TemplateLibraryDialog {...defaultProps} />);

            expect(screen.getByText('加载中...')).toBeTruthy();
        });
    });

    describe('Data loading on open', () => {
        it('loads templates and categories when dialog opens', () => {
            render(<TemplateLibraryDialog {...defaultProps} />);

            expect(mockLoadTemplates).toHaveBeenCalled();
            expect(mockLoadCategories).toHaveBeenCalled();
        });

        it('clears state when dialog opens', () => {
            render(<TemplateLibraryDialog {...defaultProps} />);

            expect(mockClearSelectedTemplate).toHaveBeenCalled();
            expect(mockClearError).toHaveBeenCalled();
        });
    });

    describe('Custom graph name', () => {
        it('shows name input after selecting template', async () => {
            const user = userEvent.setup();
            render(<TemplateLibraryDialog {...defaultProps} />);

            // Select a template
            await user.click(screen.getByText('敏捷研发管理'));

            // Name input should be visible
            expect(screen.getByPlaceholderText('图谱名称')).toBeTruthy();
        });

        it('allows custom graph name input', async () => {
            const user = userEvent.setup();
            render(<TemplateLibraryDialog {...defaultProps} />);

            // Select a template
            await user.click(screen.getByText('敏捷研发管理'));

            // Type custom name
            const nameInput = screen.getByPlaceholderText('图谱名称');
            await user.clear(nameInput);
            await user.type(nameInput, 'My Custom Project');

            expect((nameInput as HTMLInputElement).value).toBe('My Custom Project');
        });
    });

    describe('Preview toggle', () => {
        it('shows preview toggle button after selecting template', async () => {
            const user = userEvent.setup();
            render(<TemplateLibraryDialog {...defaultProps} />);

            // Select a template
            await user.click(screen.getByText('敏捷研发管理'));

            expect(screen.getByText('预览结构')).toBeTruthy();
        });
    });
});
