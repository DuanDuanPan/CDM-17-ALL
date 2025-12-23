'use client';

/**
 * Story 2.9: APP File Manager Component
 * Manages output file display, download, and preview for APP nodes
 * Extracted from AppIOConfig.tsx per Tech Spec Section 4.6
 */

import { Download, Eye, File, X } from 'lucide-react';
import type { AppOutput } from '@cdm/types';

export interface AppFileManagerProps {
  outputs: AppOutput[];
  onPreview?: (output: AppOutput) => void;
}

/**
 * Renders a list of output files with download and preview capabilities
 */
export function AppFileManager({ outputs, onPreview }: AppFileManagerProps) {
  const fileOutputs = outputs.filter((output) => output.type === 'file' && output.value);

  if (fileOutputs.length === 0) {
    return null;
  }

  const handleDownload = (output: AppOutput) => {
    // Create mock file content for download
    const mockContent = `Mock output file content for: ${output.fileName}\nGenerated: ${output.generatedAt}\nMIME Type: ${output.mimeType || 'application/octet-stream'}`;
    const blob = new Blob([mockContent], { type: output.mimeType || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = output.fileName || 'output.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePreview = (output: AppOutput) => {
    if (onPreview) {
      onPreview(output);
    } else {
      // Default preview behavior - show in alert
      const previewContent = `=== ${output.fileName} ===\n\nMock preview content\nGenerated: ${output.generatedAt}\nMIME Type: ${output.mimeType || 'unknown'}`;
      alert(previewContent);
    }
  };

  const isPreviewable = (output: AppOutput): boolean => {
    const mimeType = output.mimeType || '';
    return (
      mimeType.startsWith('text/') ||
      mimeType.startsWith('image/') ||
      mimeType === 'application/pdf' ||
      mimeType === 'application/json'
    );
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-gray-500 mb-2">输出文件</div>
      {fileOutputs.map((output) => (
        <div
          key={output.id}
          className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg"
        >
          <File className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-700 truncate">
              {output.fileName || '输出文件'}
            </div>
            {output.generatedAt && (
              <div className="text-[10px] text-gray-400 mt-0.5">
                {new Date(output.generatedAt).toLocaleString()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Download Button */}
            <button
              onClick={() => handleDownload(output)}
              className="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition-colors"
              title="下载"
            >
              <Download className="w-4 h-4" />
            </button>
            {/* Preview Button - only for previewable types */}
            {isPreviewable(output) && (
              <button
                onClick={() => handlePreview(output)}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                title="预览"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Props for input file display
 */
export interface InputFileDisplayProps {
  fileName: string;
  onClear: () => void;
}

/**
 * Displays a selected input file with clear button
 */
export function InputFileDisplay({ fileName, onClear }: InputFileDisplayProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded text-xs">
      <File className="w-3.5 h-3.5 text-emerald-500" />
      <span className="text-gray-700 flex-1 truncate">{fileName}</span>
      <button
        onClick={onClear}
        className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
        title="移除文件"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/**
 * Props for input file upload
 */
export interface InputFileUploadProps {
  onFileSelect: (file: File) => void;
}

/**
 * File upload button for input parameters
 */
export function InputFileUpload({ onFileSelect }: InputFileUploadProps) {
  return (
    <label className="flex items-center gap-2 p-2 bg-white border border-dashed border-gray-200 rounded text-xs text-gray-500 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors">
      <File className="w-3.5 h-3.5" />
      <span>点击选择文件</span>
      <input
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onFileSelect(file);
          }
          // Reset input to allow selecting same file
          e.target.value = '';
        }}
      />
    </label>
  );
}
