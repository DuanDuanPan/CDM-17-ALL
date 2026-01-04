/**
 * Story 5.1: Template Library API Service
 * Story 5.2: Subtree Template Save & Reuse
 * Story 5.3: Delete Template
 * Centralized API calls for template library operations
 *
 * Endpoints:
 * - GET /api/templates - List templates (with filtering)
 * - GET /api/templates/categories - List categories
 * - GET /api/templates/:id - Get template details
 * - POST /api/templates/:id/instantiate - Create graph from template
 * - POST /api/templates - Create new template from subtree (Story 5.2)
 * - DELETE /api/templates/:id - Delete a template (Story 5.3)
 */

import type {
    TemplateListItem,
    Template,
    TemplateCategory,
    TemplateQueryOptions,
    CreateFromTemplateRequest,
    CreateFromTemplateResponse,
    CreateTemplateRequest,
    CreateTemplateResponse,
    DeleteTemplateResponse,
} from '@cdm/types';

/**
 * Fetch templates with optional filtering
 * Story 5.2: Added userId/mine support for visibility filtering
 */
export async function fetchTemplates(
    options?: TemplateQueryOptions
): Promise<TemplateListItem[]> {
    try {
        const params = new URLSearchParams();
        if (options?.categoryId) {
            params.set('categoryId', options.categoryId);
        }
        if (options?.search) {
            params.set('search', options.search);
        }
        if (options?.limit) {
            params.set('limit', options.limit.toString());
        }
        if (options?.offset) {
            params.set('offset', options.offset.toString());
        }
        // Story 5.2: Visibility filtering
        if (options?.userId) {
            params.set('userId', options.userId);
        }
        if (options?.mine) {
            params.set('mine', 'true');
        }

        const queryString = params.toString();
        const url = queryString ? `/api/templates?${queryString}` : '/api/templates';
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch templates: ${response.status}`);
        }

        const data = await response.json();
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.templates)) return data.templates;
        throw new Error('Invalid templates response shape');
    } catch (error) {
        console.error('[templates.api] Error fetching templates:', error);
        throw error;
    }
}

/**
 * Fetch all template categories
 */
export async function fetchTemplateCategories(): Promise<TemplateCategory[]> {
    try {
        const response = await fetch('/api/templates/categories');

        if (!response.ok) {
            throw new Error(`Failed to fetch categories: ${response.status}`);
        }

        const data = await response.json();
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.categories)) return data.categories;
        throw new Error('Invalid categories response shape');
    } catch (error) {
        console.error('[templates.api] Error fetching categories:', error);
        throw error;
    }
}

/**
 * Fetch a single template by ID with full structure
 */
export async function fetchTemplate(
    id: string,
    options?: { userId?: string }
): Promise<Template> {
    try {
        const params = new URLSearchParams();
        if (options?.userId) params.set('userId', options.userId);
        const queryString = params.toString();
        const url = queryString ? `/api/templates/${id}?${queryString}` : `/api/templates/${id}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch template: ${response.status}`);
        }

        const data = await response.json();
        if (data && typeof data === 'object' && 'template' in data) {
            return (data as { template: Template }).template;
        }
        return data as Template;
    } catch (error) {
        console.error('[templates.api] Error fetching template:', error);
        throw error;
    }
}

/**
 * Instantiate a template to create a new graph
 * @param templateId - The template ID
 * @param userId - The user ID (required)
 * @param request - Optional request body with graph name
 */
export async function instantiateTemplate(
    templateId: string,
    userId: string,
    request?: CreateFromTemplateRequest
): Promise<CreateFromTemplateResponse> {
    try {
        const params = new URLSearchParams({ userId });
        const response = await fetch(`/api/templates/${templateId}/instantiate?${params}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: request ? JSON.stringify(request) : undefined,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Failed to create from template: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[templates.api] Error instantiating template:', error);
        throw error;
    }
}

/**
 * Story 5.2: Create a new template from subtree
 * @param request - Template data including structure
 * @param userId - The creator user ID
 */
export async function createTemplate(
    request: CreateTemplateRequest,
    userId: string
): Promise<CreateTemplateResponse> {
    try {
        const params = new URLSearchParams({ userId });
        const response = await fetch(`/api/templates?${params}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Failed to create template: ${response.status}`);
        }

        const data = await response.json();
        return data.template;
    } catch (error) {
        console.error('[templates.api] Error creating template:', error);
        throw error;
    }
}

/**
 * Story 5.3: Delete a template by ID
 * @param templateId - The template ID to delete
 * @param userId - The user ID (required for authorization)
 */
export async function deleteTemplate(
    templateId: string,
    userId: string
): Promise<DeleteTemplateResponse> {
    try {
        const params = new URLSearchParams({ userId });
        const response = await fetch(`/api/templates/${templateId}?${params}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Failed to delete template: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[templates.api] Error deleting template:', error);
        throw error;
    }
}
