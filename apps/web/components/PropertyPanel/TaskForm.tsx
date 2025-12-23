'use client';

/**
 * Story 2.1: Task Node Form
 * Form for Task-specific properties (status, assignee, dueDate, priority)
 * Story 2.4: Added task dispatch workflow (extracted to TaskDispatchSection)
 * Story 2.8: Added knowledge resource association (extracted to KnowledgeResourcesSection)
 * 
 * Refactored: Original 575 lines -> ~200 lines
 * Extracted components:
 * - TaskDispatchSection (task dispatch/accept/reject logic)
 * - KnowledgeResourcesSection (knowledge association UI)
 * - RejectReasonDialog (rejection modal)
 */

import { useState, useEffect, useCallback } from 'react';
import { Calendar, User, Flag } from 'lucide-react';
import type { TaskProps } from '@cdm/types';
import { TaskDispatchSection } from './TaskDispatchSection';
import { KnowledgeResourcesSection } from './KnowledgeResourcesSection';

export interface TaskFormProps {
  nodeId: string;
  initialData?: TaskProps;
  onUpdate?: (data: TaskProps) => void;
  currentUserId?: string; // Current operating user
}

export function TaskForm({ nodeId, initialData, onUpdate, currentUserId = 'test1' }: TaskFormProps) {
  const [formData, setFormData] = useState<TaskProps>({
    status: initialData?.status || 'todo',
    priority: initialData?.priority || 'medium',
    assigneeId: initialData?.assigneeId || '',
    startDate: initialData?.startDate || '',
    dueDate: initialData?.dueDate || '',
    customStage: initialData?.customStage || '',
    assignmentStatus: initialData?.assignmentStatus || 'idle',
    ownerId: initialData?.ownerId || null,
    rejectionReason: initialData?.rejectionReason || null,
    dispatchedAt: initialData?.dispatchedAt || null,
    feedbackAt: initialData?.feedbackAt || null,
    knowledgeRefs: initialData?.knowledgeRefs ?? [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFormData({
      status: initialData?.status || 'todo',
      priority: initialData?.priority || 'medium',
      assigneeId: initialData?.assigneeId || '',
      startDate: initialData?.startDate || '',
      dueDate: initialData?.dueDate || '',
      customStage: initialData?.customStage || '',
      assignmentStatus: initialData?.assignmentStatus || 'idle',
      ownerId: initialData?.ownerId || null,
      rejectionReason: initialData?.rejectionReason || null,
      dispatchedAt: initialData?.dispatchedAt || null,
      feedbackAt: initialData?.feedbackAt || null,
      knowledgeRefs: initialData?.knowledgeRefs ?? [],
    });
  }, [initialData]);

  const handleFieldChange = useCallback((field: keyof TaskProps, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onUpdate?.(updatedData);
  }, [formData, onUpdate]);

  return (
    <div className="space-y-4">
      {/* Status */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          状态
        </label>
        <select
          value={formData.status ?? 'todo'}
          onChange={(e) => handleFieldChange('status', e.target.value as TaskProps['status'])}
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="todo">待办 (To Do)</option>
          <option value="in-progress">进行中 (In Progress)</option>
          <option value="done">已完成 (Done)</option>
        </select>
      </div>

      {/* Priority */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <Flag className="w-4 h-4" />
          优先级
        </label>
        <select
          value={formData.priority ?? 'medium'}
          onChange={(e) => handleFieldChange('priority', e.target.value as TaskProps['priority'])}
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="low">低 (Low)</option>
          <option value="medium">中 (Medium)</option>
          <option value="high">高 (High)</option>
        </select>
      </div>

      {/* Assignee */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <User className="w-4 h-4" />
          执行人
        </label>
        <input
          type="text"
          value={formData.assigneeId ?? ''}
          onChange={(e) => handleFieldChange('assigneeId', e.target.value)}
          placeholder="输入执行人 ID 或邮箱"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Custom Stage */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          自定义阶段
        </label>
        <input
          type="text"
          value={formData.customStage ?? ''}
          onChange={(e) => handleFieldChange('customStage', e.target.value)}
          placeholder="例如：设计 / 开发 / 测试 / 交付"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Start Date - Story 2.3: Required for Gantt view */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4" />
          开始时间
        </label>
        <div className="flex gap-2">
          <input
            type="date"
            value={formData.startDate ? new Date(formData.startDate).toISOString().split('T')[0] : ''}
            onChange={(e) => handleFieldChange('startDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
            className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => handleFieldChange('startDate', new Date().toISOString())}
            className="px-3 py-2 text-xs bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
            title="设置为今天"
          >
            今天
          </button>
        </div>
      </div>

      {/* Due Date */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4" />
          截止时间
        </label>
        <input
          type="date"
          value={formData.dueDate ? new Date(formData.dueDate).toISOString().split('T')[0] : ''}
          onChange={(e) => handleFieldChange('dueDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Status Badge */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">任务状态</span>
          <span
            className={`px-2 py-1 rounded font-medium ${formData.status === 'done'
              ? 'bg-green-100 text-green-700'
              : formData.status === 'in-progress'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-200 text-gray-700'
              }`}
          >
            {formData.status === 'done' ? '✓ 已完成' : formData.status === 'in-progress' ? '进行中' : '待办'}
          </span>
        </div>
      </div>

      {/* Story 2.4: Task Dispatch Section */}
      <TaskDispatchSection
        nodeId={nodeId}
        formData={formData}
        currentUserId={currentUserId}
        isSubmitting={isSubmitting}
        setIsSubmitting={setIsSubmitting}
        onFormDataChange={setFormData}
        onUpdate={onUpdate}
      />

      {/* Story 2.8: Knowledge Resources Section */}
      <KnowledgeResourcesSection
        knowledgeRefs={formData.knowledgeRefs || []}
        onKnowledgeRefsChange={(refs) => handleFieldChange('knowledgeRefs', refs)}
      />
    </div>
  );
}
