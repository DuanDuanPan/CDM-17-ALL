'use client';

/**
 * Story 5.2: Save Template Dialog
 * Allows users to save selected nodes as a reusable template
 *
 * Features:
 * - Template name and description input
 * - Category selection
 * - Visibility toggle (public/private)
 * - Structure preview
 * - Form validation
 */

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Save,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import type { TemplateStructure, CreateTemplateResponse } from '@cdm/types';
import type { ExtractSubtreeResult } from '@/lib/subtree-extractor';
import { useTemplates } from '@/hooks/useTemplates';
import { countTemplateNodes } from '@/lib/subtree-extractor';
import { SaveTemplateDialogContent } from './SaveTemplateDialogContent';

export interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  structure: TemplateStructure;
  extractStats?: ExtractSubtreeResult['stats'] | null;
  userId: string;
  onSaved?: (result: CreateTemplateResponse) => void;
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  structure,
  extractStats,
  userId,
  onSaved,
}: SaveTemplateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const { categories, isSaving, error, loadCategories, saveAsTemplate, clearError } =
    useTemplates();

  // Load categories when dialog opens
  useEffect(() => {
    if (open) {
      loadCategories();
      // Set default name from root node label
      if (structure?.rootNode?.label) {
        setName(structure.rootNode.label);
      }
      setDescription('');
      setCategoryId(null);
      setIsPublic(true);
      setShowPreview(false);
      setNameError(null);
      clearError();
    }
  }, [open, structure, loadCategories, clearError]);

  // Validate name
  const validateName = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setNameError('请输入模板名称');
      return false;
    }
    if (value.length > 100) {
      setNameError('名称不能超过100个字符');
      return false;
    }
    setNameError(null);
    return true;
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validateName(name)) return;

    try {
      const result = await saveAsTemplate(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          categoryId: categoryId || undefined,
          structure,
          isPublic,
        },
        userId
      );
      onSaved?.(result);
      onOpenChange(false);
    } catch (err) {
      // Error handled by hook
      console.error('[SaveTemplateDialog] Save failed:', err);
    }
  }, [
    name,
    description,
    categoryId,
    structure,
    isPublic,
    userId,
    validateName,
    saveAsTemplate,
    onSaved,
    onOpenChange,
  ]);

  if (!open) return null;

  const nodeCount = structure ? countTemplateNodes(structure.rootNode) : 0;
  const edgeCount = structure?.edges?.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[600px] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Save className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">保存为模板</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <SaveTemplateDialogContent
          nodeCount={nodeCount}
          edgeCount={edgeCount}
          addedDescendants={extractStats?.addedDescendants}
          name={name}
          nameError={nameError}
          onNameChange={(value) => {
            setName(value);
            if (nameError) validateName(value);
          }}
          onNameBlur={() => validateName(name)}
          description={description}
          onDescriptionChange={setDescription}
          categories={categories}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          isPublic={isPublic}
          onVisibilityChange={setIsPublic}
          showPreview={showPreview}
          onTogglePreview={() => setShowPreview(!showPreview)}
          structure={structure}
        />

        {/* Error Message */}
        {error && (
          <div className="px-5 py-2 bg-red-50 border-t border-red-100">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${name.trim() && !isSaving
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                保存模板
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
export default SaveTemplateDialog;
