'use client';

/**
 * Story 5.1: Template Library Hook
 * Encapsulates template library state and API calls
 * Pattern: Follows Story 7.5's useAppLibrary hook structure
 *
 * Used by: TemplateLibraryDialog, CreateGraphFlow
 *
 * Features:
 * - List and search templates
 * - Fetch categories
 * - Preview template structure
 * - Instantiate template to create new graph
 * - Loading states
 * - Error handling
 */

import { useState, useCallback } from 'react';
import type {
    TemplateListItem,
    Template,
    TemplateCategory,
    TemplateQueryOptions,
    CreateFromTemplateRequest,
    CreateFromTemplateResponse,
} from '@cdm/types';
import {
    fetchTemplates,
    fetchTemplateCategories,
    fetchTemplate,
    instantiateTemplate,
} from '@/lib/api/templates';

export interface UseTemplatesReturn {
    // State
    templates: TemplateListItem[];
    categories: TemplateCategory[];
    selectedTemplate: Template | null;
    isLoading: boolean;
    isLoadingTemplate: boolean;
    isInstantiating: boolean;
    error: string | null;

    // Actions
    loadTemplates: (options?: TemplateQueryOptions) => Promise<void>;
    loadCategories: () => Promise<void>;
    loadTemplate: (id: string) => Promise<Template | null>;
    instantiate: (
        templateId: string,
        userId: string,
        request?: CreateFromTemplateRequest
    ) => Promise<CreateFromTemplateResponse>;
    clearSelectedTemplate: () => void;
    clearError: () => void;
}

export function useTemplates(): UseTemplatesReturn {
    const [templates, setTemplates] = useState<TemplateListItem[]>([]);
    const [categories, setCategories] = useState<TemplateCategory[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
    const [isInstantiating, setIsInstantiating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load templates with optional filtering
    const loadTemplates = useCallback(async (options?: TemplateQueryOptions) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchTemplates(options);
            setTemplates(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : '加载模板库失败';
            console.error('[useTemplates] Load templates failed:', err);
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Load categories
    const loadCategories = useCallback(async () => {
        try {
            const data = await fetchTemplateCategories();
            setCategories(data);
        } catch (err) {
            console.error('[useTemplates] Load categories failed:', err);
            // Don't set error for categories - non-critical
        }
    }, []);

    // Load single template with full structure
    const loadTemplate = useCallback(async (id: string): Promise<Template | null> => {
        setIsLoadingTemplate(true);
        setError(null);
        try {
            const data = await fetchTemplate(id);
            setSelectedTemplate(data);
            return data;
        } catch (err) {
            const message = err instanceof Error ? err.message : '加载模板详情失败';
            console.error('[useTemplates] Load template failed:', err);
            setError(message);
            return null;
        } finally {
            setIsLoadingTemplate(false);
        }
    }, []);

    // Instantiate template to create new graph
    const instantiate = useCallback(async (
        templateId: string,
        userId: string,
        request?: CreateFromTemplateRequest
    ): Promise<CreateFromTemplateResponse> => {
        setIsInstantiating(true);
        setError(null);
        try {
            const result = await instantiateTemplate(templateId, userId, request);
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : '创建图谱失败';
            console.error('[useTemplates] Instantiate failed:', err);
            setError(message);
            throw err;
        } finally {
            setIsInstantiating(false);
        }
    }, []);

    // Clear selected template
    const clearSelectedTemplate = useCallback(() => {
        setSelectedTemplate(null);
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        templates,
        categories,
        selectedTemplate,
        isLoading,
        isLoadingTemplate,
        isInstantiating,
        error,
        loadTemplates,
        loadCategories,
        loadTemplate,
        instantiate,
        clearSelectedTemplate,
        clearError,
    };
}

export default useTemplates;
