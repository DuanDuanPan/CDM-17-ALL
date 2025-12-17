'use client';

/**
 * Data Preview Dialog
 * Shows preview images based on data type:
 * - Document: Collaborative document editing interface
 * - Model: NX 3D model operation interface
 * - Drawing: ZWCAD drawing operation interface
 */

import { useEffect, useRef } from 'react';
import { X, FileText, Box, PenLine, Tag, Folder, ExternalLink } from 'lucide-react';
import type { DataType } from '@cdm/types';

export interface DataPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dataType: DataType;
  version?: string;
  storagePath?: string;
}

// Dialog configuration per data type
const DIALOG_CONFIG: Record<DataType, {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  imagePlaceholder: {
    title: string;
    description: string;
    features: string[];
  };
}> = {
  document: {
    title: '协同编辑文档',
    subtitle: 'Collaborative Document Editor',
    icon: <FileText className="w-6 h-6 text-blue-600" />,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    imagePlaceholder: {
      title: '协同文档编辑器',
      description: '多人实时协同编辑文档',
      features: [
        '实时多人协同编辑',
        '版本历史追溯',
        '评论与批注',
        '格式化文本编辑',
        '插入图片与表格',
      ],
    },
  },
  model: {
    title: 'NX 三维模型',
    subtitle: 'Siemens NX 3D Model Viewer',
    icon: <Box className="w-6 h-6 text-green-600" />,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    imagePlaceholder: {
      title: 'NX 三维模型操作',
      description: 'Siemens NX 三维 CAD/CAM/CAE 系统',
      features: [
        '3D 模型浏览与旋转',
        '零件装配结构查看',
        'BOM 清单导出',
        '尺寸测量工具',
        '剖面视图分析',
      ],
    },
  },
  drawing: {
    title: '中望CAD 图纸',
    subtitle: 'ZWCAD Drawing Viewer',
    icon: <PenLine className="w-6 h-6 text-purple-600" />,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    imagePlaceholder: {
      title: '中望CAD 图纸操作',
      description: 'ZWCAD 二维工程图纸系统',
      features: [
        '2D 图纸浏览',
        '图层管理',
        '尺寸标注查看',
        '打印与导出',
        '红线批注',
      ],
    },
  },
};

export function DataPreviewDialog({
  isOpen,
  onClose,
  dataType,
  version,
  storagePath,
}: DataPreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const config = DIALOG_CONFIG[dataType];

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 m-auto w-full max-w-3xl rounded-xl shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 ${config.bgColor} border-b ${config.borderColor}`}>
          <div className="flex items-center gap-3">
            {config.icon}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{config.title}</h2>
              <p className="text-sm text-gray-500">{config.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Metadata Bar */}
          <div className="flex items-center gap-4 mb-6 text-sm">
            {version && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full">
                <Tag className="w-3.5 h-3.5" />
                <span className="font-mono font-medium">{version}</span>
              </div>
            )}
            {storagePath && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full max-w-xs truncate">
                <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-mono text-xs truncate">{storagePath}</span>
              </div>
            )}
          </div>

          {/* Preview Image Placeholder */}
          <div className={`rounded-xl border-2 border-dashed ${config.borderColor} ${config.bgColor} p-8`}>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-md mb-4">
                {dataType === 'document' && <FileText className="w-10 h-10 text-blue-500" />}
                {dataType === 'model' && <Box className="w-10 h-10 text-green-500" />}
                {dataType === 'drawing' && <PenLine className="w-10 h-10 text-purple-500" />}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {config.imagePlaceholder.title}
              </h3>
              <p className="text-gray-600">
                {config.imagePlaceholder.description}
              </p>
            </div>

            {/* Feature List */}
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
              {config.imagePlaceholder.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-gray-700 bg-white/70 rounded-lg px-3 py-2"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    dataType === 'document' ? 'bg-blue-500' :
                    dataType === 'model' ? 'bg-green-500' :
                    'bg-purple-500'
                  }`} />
                  {feature}
                </div>
              ))}
            </div>

            {/* Placeholder Image Area */}
            <div className="mt-8 aspect-video bg-white rounded-lg border border-gray-200 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="w-16 h-16 mx-auto mb-3 rounded-lg bg-gray-100 flex items-center justify-center">
                  {dataType === 'document' && <FileText className="w-8 h-8" />}
                  {dataType === 'model' && <Box className="w-8 h-8" />}
                  {dataType === 'drawing' && <PenLine className="w-8 h-8" />}
                </div>
                <p className="text-sm">
                  {dataType === 'document' && '协同编辑文档预览区域'}
                  {dataType === 'model' && 'NX 三维模型预览区域'}
                  {dataType === 'drawing' && '中望CAD 图纸预览区域'}
                </p>
                <p className="text-xs mt-1 text-gray-300">
                  此处将显示实际的{config.title}界面截图
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            点击外部区域或按 ESC 关闭
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              关闭
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              在新窗口打开
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
