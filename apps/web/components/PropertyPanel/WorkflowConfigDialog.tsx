'use client';

/**
 * Story 4.1: Workflow Configuration Dialog
 * Allows users to select predefined workflow templates and configure approval steps
 * Uses React Portal to render at document.body level for proper centering
 *
 * Story 7.5: Refactored to use Hook-First pattern
 * - Removed 1 direct fetch() call
 * - Now uses useApprovalConfig hook following Story 7.2 pattern
 */

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Loader2, Settings, Users } from 'lucide-react';
import { Button } from '@cdm/ui';
import { UserSelector } from '../UserSelector';
import { useApprovalConfig } from '@/hooks/useApprovalConfig';
import type { WorkflowStep } from '@/lib/api/approval';

// Predefined workflow templates
const WORKFLOW_TEMPLATES = [
    {
        id: 'simple',
        name: '简单审批',
        description: '单人审批',
        steps: [{ name: '审批', assigneeId: '' }],
    },
    {
        id: 'review',
        name: '编写-校对-审核',
        description: '三级审批流程',
        steps: [
            { name: '编写', assigneeId: '' },
            { name: '校对', assigneeId: '' },
            { name: '审核', assigneeId: '' },
        ],
    },
    {
        id: 'dual',
        name: '初审-终审',
        description: '两级审批',
        steps: [
            { name: '初审', assigneeId: '' },
            { name: '终审', assigneeId: '' },
        ],
    },
    {
        id: 'custom',
        name: '自定义流程',
        description: '自行添加审批步骤',
        steps: [],
    },
];

interface WorkflowConfigDialogProps {
    nodeId: string;
    onClose: () => void;
    onConfigured: () => void;
}

export function WorkflowConfigDialog({
    nodeId,
    onClose,
    onConfigured,
}: WorkflowConfigDialogProps) {
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [steps, setSteps] = useState<WorkflowStep[]>([]);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    const { configure, isSubmitting, error: submitError, clearError } = useApprovalConfig();

    // Wait for client-side mount before using portal
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Select a template
    const handleSelectTemplate = useCallback((templateId: string) => {
        const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
        if (template) {
            setSelectedTemplate(templateId);
            setSteps(template.steps.map((s) => ({ ...s })));
            setValidationError(null);
            clearError();
        }
    }, [clearError]);

    // Add a step (for custom template)
    const handleAddStep = useCallback(() => {
        setSteps((prev) => [...prev, { name: `步骤 ${prev.length + 1}`, assigneeId: '' }]);
    }, []);

    // Remove a step
    const handleRemoveStep = useCallback((index: number) => {
        setSteps((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // Update step name
    const handleStepNameChange = useCallback((index: number, name: string) => {
        setSteps((prev) =>
            prev.map((step, i) => (i === index ? { ...step, name } : step))
        );
    }, []);

    // Update step assignee
    const handleStepAssigneeChange = useCallback((index: number, assigneeId: string) => {
        setSteps((prev) =>
            prev.map((step, i) => (i === index ? { ...step, assigneeId } : step))
        );
    }, []);

    // Submit configuration
    const handleSubmit = useCallback(async () => {
        setValidationError(null);
        clearError();

        // Validation
        if (steps.length === 0) {
            setValidationError('请至少添加一个审批步骤');
            return;
        }

        const emptyAssignees = steps.filter((s) => !s.assigneeId);
        if (emptyAssignees.length > 0) {
            setValidationError('请为所有步骤指定审批人');
            return;
        }

        try {
            await configure(nodeId, steps);
            onConfigured();
            onClose();
        } catch (err) {
            // Error already captured in hook state
            console.error('[WorkflowConfigDialog] Configure failed:', err);
        }
    }, [nodeId, steps, configure, onConfigured, onClose, clearError]);

    // Don't render until mounted (for SSR compatibility)
    if (!mounted) return null;

    const error = validationError || submitError;

    const dialogContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h2 className="text-xl font-bold flex items-center gap-3 text-gray-800">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Settings className="h-5 w-5 text-blue-600" />
                        </div>
                        配置审批流程
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Template Selection */}
                    {!selectedTemplate && (
                        <div className="space-y-4">
                            <p className="text-base font-medium text-gray-700">选择流程模板：</p>
                            <div className="grid grid-cols-2 gap-4">
                                {WORKFLOW_TEMPLATES.map((template) => (
                                    <button
                                        key={template.id}
                                        type="button"
                                        onClick={() => handleSelectTemplate(template.id)}
                                        className="p-4 text-left border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 hover:shadow-md transition-all group"
                                    >
                                        <p className="text-base font-semibold text-gray-900 group-hover:text-blue-700">
                                            {template.name}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {template.description}
                                        </p>
                                        <p className="text-xs text-blue-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            点击选择 →
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step Configuration */}
                    {selectedTemplate && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => {
                                        setSelectedTemplate(null);
                                        setSteps([]);
                                        setValidationError(null);
                                        clearError();
                                    }}
                                    className="p-0"
                                >
                                    ← 返回选择模板
                                </Button>
                                <span className="text-sm text-gray-500">
                                    {WORKFLOW_TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        审批步骤
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleAddStep}
                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                        <Plus className="h-3 w-3" />
                                        添加步骤
                                    </Button>
                                </div>

                                {steps.length === 0 && (
                                    <p className="text-sm text-gray-400 py-4 text-center">
                                        点击"添加步骤"开始配置
                                    </p>
                                )}

                                {steps.map((step, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl hover:shadow-sm transition-shadow"
                                    >
                                        {/* Step Number */}
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                                            {index + 1}
                                        </div>

                                        {/* Step Name */}
                                        <div className="flex-1 min-w-0">
                                            <label className="block text-xs text-gray-500 mb-1">步骤名称</label>
                                            <input
                                                type="text"
                                                value={step.name}
                                                onChange={(e) => handleStepNameChange(index, e.target.value)}
                                                placeholder="输入步骤名称"
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        </div>

                                        {/* Assignee Selector */}
                                        <div className="flex-1 min-w-0 relative">
                                            <label className="block text-xs text-gray-500 mb-1">审批人</label>
                                            <UserSelector
                                                value={step.assigneeId}
                                                onChange={(userId) => handleStepAssigneeChange(index, userId)}
                                                placeholder="选择审批人..."
                                            />
                                        </div>

                                        {/* Delete Button */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveStep(index)}
                                            title="删除步骤"
                                            className="flex-shrink-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                ))}

                                {/* Spacer for dropdown visibility */}
                                {steps.length > 0 && <div className="h-32" />}
                            </div>

                            {/* Error Message */}
                            {error && (
                                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                                    {error}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {selectedTemplate && (
                    <div className="flex justify-end gap-2 px-4 py-3 border-t bg-gray-50">
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            取消
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || steps.length === 0}
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            确认配置
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );

    // Use portal to render at document.body level
    return createPortal(dialogContent, document.body);
}

export default WorkflowConfigDialog;
