import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeftSidebar } from '@/components/layout/LeftSidebar';

const { mockUseTemplates } = vi.hoisted(() => ({
  mockUseTemplates: vi.fn(),
}));

vi.mock('@/hooks/useTemplates', () => ({
  useTemplates: mockUseTemplates,
}));

describe('LeftSidebar template drag', () => {
  beforeEach(() => {
    mockUseTemplates.mockReturnValue({
      templates: [
        {
          id: 'tpl-1',
          name: '敏捷研发管理',
          description: '适用于敏捷开发团队',
          defaultClassification: 'internal',
          usageCount: 1,
          creatorId: 'test1',
        },
      ],
      isLoading: false,
      error: null,
      loadTemplates: vi.fn(),
      loadTemplate: vi.fn(),
      selectedTemplate: null,
      isLoadingTemplate: false,
      deleteTemplate: vi.fn(),
      isDeleting: false,
    });
  });

  it('keeps templates panel open on dragStart', () => {
    const { container } = render(<LeftSidebar userId="test1" />);

    const templatesNavButton = container.querySelector('button[data-nav-id="templates"]');
    expect(templatesNavButton).toBeTruthy();

    fireEvent.click(templatesNavButton!);

    expect(screen.getByText('敏捷研发管理')).toBeTruthy();
    expect(screen.getByText('提示：拖拽模板到画布，挂载为选中节点的子节点')).toBeTruthy();

    const draggableTemplateCard = container.querySelector('div[draggable="true"]');
    expect(draggableTemplateCard).toBeTruthy();

    const dataTransfer = { setData: vi.fn(), effectAllowed: 'none' };
    fireEvent.dragStart(draggableTemplateCard!, { dataTransfer });

    // Regression: previously the sidebar closed immediately on dragStart (unmounting the draggable),
    // which cancels the drag and prevents drop insertion.
    expect(screen.getByText('敏捷研发管理')).toBeTruthy();
    expect(screen.getByText('提示：拖拽模板到画布，挂载为选中节点的子节点')).toBeTruthy();
  });
});

