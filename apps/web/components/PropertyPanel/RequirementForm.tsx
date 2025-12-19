'use client';

/**
 * Story 2.1: Requirement Node Form
 * Form for Requirement-specific properties (reqType, acceptanceCriteria, priority)
 */

import { useState, useEffect } from 'react';
import { FileText, Flag } from 'lucide-react';
import type { RequirementProps } from '@cdm/types';

export interface RequirementFormProps {
  nodeId: string;
  initialData?: RequirementProps;
  onUpdate?: (data: RequirementProps) => void;
}

export function RequirementForm({ nodeId, initialData, onUpdate }: RequirementFormProps) {
  const [formData, setFormData] = useState<RequirementProps>({
    reqType: initialData?.reqType || '',
    acceptanceCriteria: initialData?.acceptanceCriteria || '',
    priority: initialData?.priority || 'must',
  });

  useEffect(() => {
    setFormData({
      reqType: initialData?.reqType || '',
      acceptanceCriteria: initialData?.acceptanceCriteria || '',
      priority: initialData?.priority || 'must',
    });
  }, [initialData]);

  const handleFieldChange = (field: keyof RequirementProps, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onUpdate?.(updatedData);
  };

  return (
    <div className="space-y-4">
      {/* Requirement Type */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4" />
          需求类型
        </label>
        <input
          type="text"
          value={formData.reqType ?? ''}
          onChange={(e) => handleFieldChange('reqType', e.target.value)}
          placeholder="例如: 功能性需求、非功能性需求"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Priority (MoSCoW) */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <Flag className="w-4 h-4" />
          优先级 (MoSCoW)
        </label>
        <select
          value={formData.priority ?? 'must'}
          onChange={(e) => handleFieldChange('priority', e.target.value as RequirementProps['priority'])}
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="must">Must Have (必须)</option>
          <option value="should">Should Have (应该)</option>
          <option value="could">Could Have (可以)</option>
          <option value="wont">Won't Have (不会)</option>
        </select>
      </div>

      {/* Acceptance Criteria */}
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">验收标准</label>
        <textarea
          value={formData.acceptanceCriteria ?? ''}
          onChange={(e) => handleFieldChange('acceptanceCriteria', e.target.value)}
          placeholder="输入验收标准..."
          className="w-full min-h-[120px] text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-y"
        />
      </div>

      {/* Priority Badge */}
      <div className="mt-4 p-3 bg-purple-50 rounded-md">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">需求优先级</span>
          <span
            className={`px-2 py-1 rounded font-medium ${
              formData.priority === 'must'
                ? 'bg-red-100 text-red-700'
                : formData.priority === 'should'
                ? 'bg-orange-100 text-orange-700'
                : formData.priority === 'could'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {formData.priority === 'must'
              ? 'Must Have'
              : formData.priority === 'should'
              ? 'Should Have'
              : formData.priority === 'could'
              ? 'Could Have'
              : "Won't Have"}
          </span>
        </div>
      </div>
    </div>
  );
}
