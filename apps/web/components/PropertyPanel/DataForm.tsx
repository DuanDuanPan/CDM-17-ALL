'use client';

/**
 * Story 2.1: Data Node Form
 * Form for Data-specific properties (dataType, version, secretLevel, storagePath)
 * Supports opening preview dialogs based on data type
 */

import { useState, useEffect } from 'react';
import { Database, FileType, Shield, Folder, Tag, ExternalLink, FileText, Box, PenLine } from 'lucide-react';
import type { DataProps, DataType } from '@cdm/types';
import { DataPreviewDialog } from './DataPreviewDialog';

export interface DataFormProps {
  nodeId: string;
  initialData?: DataProps;
  onUpdate?: (data: DataProps) => void;
}

// Labels for data types
const DATA_TYPE_LABELS: Record<DataType, { label: string; description: string }> = {
  document: { label: '文档', description: '协同编辑文档' },
  model: { label: '模型', description: 'NX 三维模型' },
  drawing: { label: '图纸', description: '中望CAD 图纸' },
};

export function DataForm({ nodeId: _nodeId, initialData, onUpdate }: DataFormProps) {
  const [formData, setFormData] = useState<DataProps>({
    dataType: initialData?.dataType || 'document',
    version: initialData?.version || 'v1.0.0',
    secretLevel: initialData?.secretLevel || 'public',
    storagePath: initialData?.storagePath || '',
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    setFormData({
      dataType: initialData?.dataType || 'document',
      version: initialData?.version || 'v1.0.0',
      secretLevel: initialData?.secretLevel || 'public',
      storagePath: initialData?.storagePath || '',
    });
  }, [initialData]);

  const handleFieldChange = (field: keyof DataProps, value: unknown) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onUpdate?.(updatedData);
  };

  const handleOpenPreview = () => {
    setIsDialogOpen(true);
  };

  // Get icon based on data type
  const getDataTypeIcon = (type: DataType) => {
    switch (type) {
      case 'document':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'model':
        return <Box className="w-4 h-4 text-green-600" />;
      case 'drawing':
        return <PenLine className="w-4 h-4 text-purple-600" />;
      default:
        return <FileType className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Data Type */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <FileType className="w-4 h-4" />
          数据类型
        </label>
        <select
          value={formData.dataType}
          onChange={(e) => handleFieldChange('dataType', e.target.value as DataType)}
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="document">📄 文档 (Document)</option>
          <option value="model">📦 模型 (Model)</option>
          <option value="drawing">📐 图纸 (Drawing)</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          {DATA_TYPE_LABELS[formData.dataType || 'document']?.description}
        </p>
      </div>

      {/* Version */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <Tag className="w-4 h-4" />
          版本号
        </label>
        <input
          type="text"
          value={formData.version ?? ''}
          onChange={(e) => handleFieldChange('version', e.target.value)}
          placeholder="例如: v1.0.0"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">语义化版本号 (SemVer)</p>
      </div>

      {/* Secret Level */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <Shield className="w-4 h-4" />
          密级
        </label>
        <select
          value={formData.secretLevel ?? 'public'}
          onChange={(e) => handleFieldChange('secretLevel', e.target.value as DataProps['secretLevel'])}
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="public">公开 (Public)</option>
          <option value="internal">内部 (Internal)</option>
          <option value="secret">机密 (Secret)</option>
        </select>
      </div>

      {/* Storage Path */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <Folder className="w-4 h-4" />
          存储路径
        </label>
        <input
          type="text"
          value={formData.storagePath ?? ''}
          onChange={(e) => handleFieldChange('storagePath', e.target.value)}
          placeholder="例如: /data/exports/2024/report.docx"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">文件系统路径或 S3 URI</p>
      </div>

      {/* Open Button */}
      <div>
        <button
          type="button"
          onClick={handleOpenPreview}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          打开{DATA_TYPE_LABELS[formData.dataType || 'document']?.label}
        </button>
      </div>

      {/* Data Asset Badge */}
      <div className="mt-4 p-3 bg-orange-50 rounded-md">
        <div className="flex items-center gap-2 text-xs mb-2">
          <Database className="w-4 h-4 text-orange-600" />
          <span className="font-medium text-orange-900">数据资产</span>
        </div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">类型</span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 font-medium">
              {getDataTypeIcon(formData.dataType || 'document')}
              {DATA_TYPE_LABELS[formData.dataType || 'document']?.label}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">版本</span>
            <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-mono font-medium">
              {formData.version || 'v1.0.0'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">安全级别</span>
            <span
              className={`px-2 py-1 rounded font-medium ${
                formData.secretLevel === 'secret'
                  ? 'bg-red-100 text-red-700'
                  : formData.secretLevel === 'internal'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {formData.secretLevel === 'secret'
                ? '机密'
                : formData.secretLevel === 'internal'
                ? '内部'
                : '公开'}
            </span>
          </div>
        </div>
      </div>

      {/* Preview Dialog */}
      <DataPreviewDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        dataType={formData.dataType || 'document'}
        version={formData.version ?? undefined}
        storagePath={formData.storagePath ?? undefined}
      />
    </div>
  );
}
