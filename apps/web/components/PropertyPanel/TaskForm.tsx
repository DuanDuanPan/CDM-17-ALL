'use client';

/**
 * Story 2.1: Task Node Form
 * Form for Task-specific properties (status, assignee, dueDate, priority)
 */

import { useState, useEffect } from 'react';
import { Calendar, User, Flag, Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { TaskProps, AssignmentStatus } from '@cdm/types';
import { useToast } from '@cdm/ui';

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
  });

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addToast } = useToast();

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
    });
  }, [initialData]);

  const handleFieldChange = (field: keyof TaskProps, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onUpdate?.(updatedData);
  };

  // Story 2.4: Task dispatch handler
  // [AI-Review][HIGH-5] Fixed: Now calls onUpdate to sync with X6/Yjs
  // [AI-Review][MEDIUM-3] Fixed: Safe error parsing for API responses
  const handleDispatch = async () => {
    if (!formData.assigneeId) {
      addToast({ type: 'warning', title: '缺少信息', description: '请先指定执行人' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/nodes/${nodeId}:dispatch?userId=${encodeURIComponent(currentUserId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        // [AI-Review][MEDIUM-3] Safe error parsing
        const errorText = await response.text();
        let errorMessage = '派发失败';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const now = new Date().toISOString();
      const updatedData: TaskProps = {
        ...formData,
        assignmentStatus: 'dispatched',
        ownerId: currentUserId,
        dispatchedAt: now,
      };
      setFormData(updatedData);

      // [AI-Review][HIGH-5] Sync to X6/Yjs via onUpdate
      onUpdate?.(updatedData);

      addToast({ type: 'success', title: '派发成功', description: '任务已成功派发！' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '派发失败，请重试';
      addToast({ type: 'error', title: '派发失败', description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Story 2.4: Task accept handler
  // [AI-Review][HIGH-5] Fixed: Now calls onUpdate to sync with X6/Yjs
  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/nodes/${nodeId}:feedback?userId=${encodeURIComponent(currentUserId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = '接受失败';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const now = new Date().toISOString();
      const updatedData: TaskProps = {
        ...formData,
        assignmentStatus: 'accepted',
        status: 'todo',
        feedbackAt: now,
      };
      setFormData(updatedData);

      // [AI-Review][HIGH-5] Sync to X6/Yjs via onUpdate
      onUpdate?.(updatedData);

      addToast({ type: 'success', title: '接受成功', description: '任务已接受！' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '接受失败，请重试';
      addToast({ type: 'error', title: '接受失败', description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Story 2.4: Task reject handler
  // [AI-Review][HIGH-5] Fixed: Now calls onUpdate to sync with X6/Yjs
  const handleReject = async (reason: string) => {
    if (!reason?.trim()) {
      addToast({ type: 'warning', title: '提示', description: '请填写驳回理由' });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/nodes/${nodeId}:feedback?userId=${encodeURIComponent(currentUserId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = '驳回失败';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const now = new Date().toISOString();
      const updatedData: TaskProps = {
        ...formData,
        assignmentStatus: 'rejected',
        rejectionReason: reason,
        feedbackAt: now,
      };
      setFormData(updatedData);

      // [AI-Review][HIGH-5] Sync to X6/Yjs via onUpdate
      onUpdate?.(updatedData);

      setShowRejectDialog(false);
      addToast({ type: 'success', title: '驳回成功', description: '任务已驳回' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '驳回失败，请重试';
      addToast({ type: 'error', title: '驳回失败', description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Story 2.4: Assignment Section */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Send className="w-4 h-4" />
          任务派发
        </h3>

        {/* Assignment Status Badge */}
        <div className="mb-3 p-3 rounded-md bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">派发状态</span>
            <span
              className={`px-2 py-1 rounded text-xs font-medium ${formData.assignmentStatus === 'accepted'
                ? 'bg-green-100 text-green-700 border border-green-300'
                : formData.assignmentStatus === 'dispatched'
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                  : formData.assignmentStatus === 'rejected'
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
            >
              {formData.assignmentStatus === 'accepted' && '✓ 已接受'}
              {formData.assignmentStatus === 'dispatched' && '⏳ 待确认'}
              {formData.assignmentStatus === 'rejected' && '✗ 已驳回'}
              {formData.assignmentStatus === 'idle' && '待派发'}
            </span>
          </div>
        </div>

        {/* Rejection Reason Display */}
        {formData.assignmentStatus === 'rejected' && formData.rejectionReason && (
          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-medium text-red-800 mb-1">驳回理由</p>
                <p className="text-xs text-red-700">{formData.rejectionReason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Owner View */}
        {currentUserId === formData.ownerId || (!formData.ownerId && (formData.assignmentStatus === 'idle' || formData.assignmentStatus === 'rejected')) ? (
          <div className="space-y-2">
            {(formData.assignmentStatus === 'idle' || formData.assignmentStatus === 'rejected') && (
              <button
                type="button"
                onClick={handleDispatch}
                disabled={isSubmitting || !formData.assigneeId}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? '派发中...' : '派发任务'}
              </button>
            )}
            {formData.assignmentStatus === 'dispatched' && (
              <div className="text-xs text-gray-500 text-center py-2">
                等待执行人确认...
              </div>
            )}
          </div>
        ) : null}

        {/* Action Buttons - Assignee View */}
        {currentUserId === formData.assigneeId && formData.assignmentStatus === 'dispatched' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting ? '接受中...' : '接受'}
            </button>
            <button
              type="button"
              onClick={() => setShowRejectDialog(true)}
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <XCircle className="w-4 h-4" />
              驳回
            </button>
          </div>
        )}

        {/* Timestamp Info */}
        {formData.dispatchedAt && (
          <div className="mt-3 text-xs text-gray-500">
            派发时间: {new Date(formData.dispatchedAt).toLocaleString('zh-CN')}
          </div>
        )}
        {formData.feedbackAt && (
          <div className="text-xs text-gray-500">
            反馈时间: {new Date(formData.feedbackAt).toLocaleString('zh-CN')}
          </div>
        )}
      </div>

      {/* Reject Reason Dialog */}
      {showRejectDialog && (
        <RejectReasonDialog
          onConfirm={handleReject}
          onCancel={() => setShowRejectDialog(false)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

// Story 2.4: Reject Reason Dialog Component
interface RejectReasonDialogProps {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function RejectReasonDialog({ onConfirm, onCancel, isSubmitting }: RejectReasonDialogProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onCancel}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-600" />
          驳回任务
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          请说明驳回理由，以便任务所有者了解问题所在。
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="例如：任务描述不清晰，需要更多细节..."
          className="w-full h-32 text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
          autoFocus
        />
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={isSubmitting || !reason.trim()}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {isSubmitting ? '提交中...' : '确认驳回'}
          </button>
        </div>
      </div>
    </div>
  );
}
