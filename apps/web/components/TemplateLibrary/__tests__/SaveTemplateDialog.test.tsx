/**
 * Story 5.2: SaveTemplateDialog Component Tests
 * Tests for the save template dialog UI and behavior
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveTemplateDialog } from '../SaveTemplateDialog';
import type { TemplateStructure, TemplateCategory, CreateTemplateResponse } from '@cdm/types';

// Mock useTemplates hook
const mockSaveAsTemplate = vi.fn();
const mockLoadCategories = vi.fn();
const mockClearError = vi.fn();

vi.mock('@/hooks/useTemplates', () => ({
  useTemplates: () => ({
    categories: [
      { id: 'cat-1', name: '项目管理', icon: 'Kanban' },
      { id: 'cat-2', name: '技术设计', icon: 'Code' },
    ] as TemplateCategory[],
    isSaving: false,
    error: null,
    loadCategories: mockLoadCategories,
    saveAsTemplate: mockSaveAsTemplate,
    clearError: mockClearError,
  }),
}));

describe('SaveTemplateDialog', () => {
  const defaultStructure: TemplateStructure = {
    rootNode: {
      label: 'Test Root',
      _tempId: 'temp-root',
      children: [
        { label: 'Child 1', _tempId: 'temp-1' },
        { label: 'Child 2', _tempId: 'temp-2', type: 'TASK' },
      ],
    },
    edges: [
      { sourceRef: 'temp-1', targetRef: 'temp-2', kind: 'dependency' },
    ],
  };

  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    structure: defaultStructure,
    userId: 'user-1',
    onSaved: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSaveAsTemplate.mockResolvedValue({
      id: 'tpl-new',
      name: 'Test Template',
      createdAt: new Date().toISOString(),
    } as CreateTemplateResponse);
  });

  // TC-5.2-COMP-1: Dialog renders when open
  describe('Rendering', () => {
    it('TC-5.2-COMP-1: renders dialog when open is true', () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      expect(screen.getByText('保存为模板')).toBeTruthy();
      expect(screen.getByPlaceholderText('输入模板名称...')).toBeTruthy();
    });

    it('does not render when open is false', () => {
      render(<SaveTemplateDialog {...defaultProps} open={false} />);

      expect(screen.queryByText('保存为模板')).toBeNull();
    });

    // TC-5.2-COMP-2: Shows node count
    it('TC-5.2-COMP-2: displays node count from structure', () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      expect(screen.getByText('3')).toBeTruthy(); // 3 nodes total
    });

    // TC-5.2-COMP-3: Shows edge count
    it('TC-5.2-COMP-3: displays edge count when present', () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      expect(screen.getByText('1')).toBeTruthy(); // 1 edge
    });

    // TC-5.2-COMP-4: Pre-fills name from root node label
    it('TC-5.2-COMP-4: pre-fills name from root node label', () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      const input = screen.getByPlaceholderText('输入模板名称...') as HTMLInputElement;
      expect(input.value).toBe('Test Root');
    });
  });

  // TC-5.2-COMP-5: Category selection
  describe('Category Selection', () => {
    it('TC-5.2-COMP-5: renders category buttons', () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      expect(screen.getByText('项目管理')).toBeTruthy();
      expect(screen.getByText('技术设计')).toBeTruthy();
      expect(screen.getByText('未分类')).toBeTruthy();
    });

    it('allows selecting a category', async () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      const categoryBtn = screen.getByText('项目管理');
      await userEvent.click(categoryBtn);

      // After click, button should have selected style
      expect(categoryBtn.className).toContain('bg-blue-100');
    });
  });

  // TC-5.2-COMP-6: Visibility toggle
  describe('Visibility Toggle', () => {
    it('TC-5.2-COMP-6: defaults to public visibility', () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      const publicBtn = screen.getByText('公开').closest('button');
      expect(publicBtn?.className).toContain('border-blue-500');
    });

    it('allows toggling to private visibility', async () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      const privateBtn = screen.getByText('私有').closest('button');
      await userEvent.click(privateBtn!);

      expect(privateBtn?.className).toContain('border-blue-500');
    });
  });

  // TC-5.2-COMP-7: Form validation
  describe('Form Validation', () => {
    it('TC-5.2-COMP-7: disables save button when name is empty', async () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      const input = screen.getByPlaceholderText('输入模板名称...');
      await userEvent.clear(input);

      const saveBtn = screen.getByText('保存模板').closest('button');
      expect(saveBtn?.hasAttribute('disabled')).toBe(true);
    });

    it('shows error when name is empty on blur', async () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      const input = screen.getByPlaceholderText('输入模板名称...');
      await userEvent.clear(input);
      fireEvent.blur(input);

      expect(screen.getByText('请输入模板名称')).toBeTruthy();
    });

    it('shows error when name exceeds 100 characters', async () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      const input = screen.getByPlaceholderText('输入模板名称...');
      const longName = 'a'.repeat(101);
      await userEvent.clear(input);
      await userEvent.type(input, longName);
      fireEvent.blur(input);

      expect(screen.getByText('名称不能超过100个字符')).toBeTruthy();
    });
  });

  // TC-5.2-COMP-8: Save action
  describe('Save Action', () => {
    it('TC-5.2-COMP-8: calls saveAsTemplate with correct params', async () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      // Name is already pre-filled
      const saveBtn = screen.getByText('保存模板').closest('button');
      await userEvent.click(saveBtn!);

      await waitFor(() => {
        expect(mockSaveAsTemplate).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Root',
            structure: defaultStructure,
            isPublic: true,
          }),
          'user-1'
        );
      });
    });

    it('calls onSaved and closes dialog on success', async () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      const saveBtn = screen.getByText('保存模板').closest('button');
      await userEvent.click(saveBtn!);

      await waitFor(() => {
        expect(defaultProps.onSaved).toHaveBeenCalled();
        expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  // TC-5.2-COMP-9: Preview toggle
  describe('Preview Toggle', () => {
    it('TC-5.2-COMP-9: toggles structure preview on click', async () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      const toggleBtn = screen.getByText('显示结构预览');
      await userEvent.click(toggleBtn);

      // After clicking, should show the structure
      // Note: Multiple "Test Root" elements may exist, so use getAllByText
      const testRootElements = screen.getAllByText('Test Root');
      expect(testRootElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Child 1')).toBeTruthy();
      expect(screen.getByText('Child 2')).toBeTruthy();
    });
  });

  // TC-5.2-COMP-10: Dialog close
  describe('Dialog Close', () => {
    it('TC-5.2-COMP-10a: closes on backdrop click', async () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      const backdrop = document.querySelector('.bg-black\\/50');
      await userEvent.click(backdrop!);

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it('TC-5.2-COMP-10b: closes on X button click', async () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      const closeBtn = screen.getAllByRole('button').find((btn) =>
        btn.querySelector('svg.lucide-x')
      );
      await userEvent.click(closeBtn!);

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it('TC-5.2-COMP-10c: closes on cancel button click', async () => {
      render(<SaveTemplateDialog {...defaultProps} />);

      const cancelBtn = screen.getByText('取消');
      await userEvent.click(cancelBtn);

      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
