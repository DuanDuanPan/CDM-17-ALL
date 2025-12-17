'use client';

/**
 * Story 2.1: PBS Node Form
 * Form for PBS (Product Breakdown Structure) properties (code, version, ownerId)
 */

import { useState, useEffect } from 'react';
import { Box, Hash, Tag, User } from 'lucide-react';
import type { PBSProps } from '@cdm/types';

export interface PBSFormProps {
  nodeId: string;
  initialData?: PBSProps;
  onUpdate?: (data: PBSProps) => void;
}

export function PBSForm({ nodeId, initialData, onUpdate }: PBSFormProps) {
  const [formData, setFormData] = useState<PBSProps>({
    code: initialData?.code || '',
    version: initialData?.version || 'v1.0.0',
    ownerId: initialData?.ownerId || '',
  });

  useEffect(() => {
    setFormData({
      code: initialData?.code || '',
      version: initialData?.version || 'v1.0.0',
      ownerId: initialData?.ownerId || '',
    });
  }, [initialData]);

  const handleFieldChange = (field: keyof PBSProps, value: any) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onUpdate?.(updatedData);
  };

  return (
    <div className="space-y-4">
      {/* PBS Code */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <Hash className="w-4 h-4" />
          PBS 编码
        </label>
        <input
          type="text"
          value={formData.code}
          onChange={(e) => handleFieldChange('code', e.target.value)}
          placeholder="例如: PBS-001"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">产品分解结构唯一标识符</p>
      </div>

      {/* Version */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <Tag className="w-4 h-4" />
          版本号
        </label>
        <input
          type="text"
          value={formData.version}
          onChange={(e) => handleFieldChange('version', e.target.value)}
          placeholder="例如: v1.0.0"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">语义化版本号 (Semantic Versioning)</p>
      </div>

      {/* Owner */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <User className="w-4 h-4" />
          负责人
        </label>
        <input
          type="text"
          value={formData.ownerId}
          onChange={(e) => handleFieldChange('ownerId', e.target.value)}
          placeholder="输入负责人 ID 或邮箱"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Info Badge */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="flex items-center gap-2 text-xs text-blue-700">
          <Box className="w-4 h-4" />
          <span className="font-medium">产品分解结构 (PBS)</span>
        </div>
        {formData.code && (
          <div className="mt-2 text-xs text-gray-600">
            当前编码: <span className="font-mono font-medium">{formData.code}</span>
          </div>
        )}
      </div>
    </div>
  );
}
