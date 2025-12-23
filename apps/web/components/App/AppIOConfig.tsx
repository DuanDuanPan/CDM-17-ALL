'use client';

/**
 * Story 2.9: APP I/O Configuration Component
 * Manages input parameters and output results for APP nodes
 */

import { useCallback, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, Plus, Trash2, FileInput, FileOutput, Type, Hash, File, Download, Eye, ChevronDown, ChevronRight, Eraser } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useConfirmDialog } from '@cdm/ui';
import type { AppInput, AppOutput } from '@cdm/types';
import { InputFileDisplay, InputFileUpload } from './AppFileManager';
import { FilePreviewModal } from './FilePreviewModal';

export interface AppIOConfigProps {
  inputs: AppInput[];
  outputs: AppOutput[];
  onInputsChange: (inputs: AppInput[]) => void;
  onOutputsChange: (outputs: AppOutput[]) => void;
}

const INPUT_TYPE_OPTIONS = [
  { value: 'text', label: '文本', icon: <Type className="w-3.5 h-3.5" /> },
  { value: 'number', label: '数值', icon: <Hash className="w-3.5 h-3.5" /> },
  { value: 'file', label: '文件', icon: <File className="w-3.5 h-3.5" /> },
] as const;

const OUTPUT_TYPE_OPTIONS = [
  { value: 'text', label: '文本', icon: <Type className="w-3.5 h-3.5" /> },
  { value: 'file', label: '文件', icon: <File className="w-3.5 h-3.5" /> },
] as const;

const isPreviewableOutput = (output: AppOutput): boolean => {
  const mimeType = output.mimeType || '';
  return (
    mimeType.startsWith('text/') ||
    mimeType.startsWith('image/') ||
    mimeType === 'application/pdf' ||
    mimeType === 'application/json'
  );
};

export function AppIOConfig({ inputs, outputs, onInputsChange, onOutputsChange }: AppIOConfigProps) {
  const { showConfirm } = useConfirmDialog();
  const [isInputsExpanded, setIsInputsExpanded] = useState(true);
  const [isOutputsExpanded, setIsOutputsExpanded] = useState(true);
  const [previewOutput, setPreviewOutput] = useState<AppOutput | null>(null);

  // Input handlers
  const handleAddInput = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling collapse
    const newInput: AppInput = {
      id: nanoid(8),
      key: '',
      type: 'text',
      required: false,
    };
    onInputsChange([...inputs, newInput]);
    setIsInputsExpanded(true); // Auto-expand when adding
  }, [inputs, onInputsChange]);

  const handleClearInputs = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm({
      title: '确认清空',
      description: '确定要清空所有输入参数吗？此操作无法撤销。',
      confirmText: '清空',
      cancelText: '取消',
      variant: 'danger',
      onConfirm: () => onInputsChange([]),
    });
  }, [onInputsChange, showConfirm]);

  const handleInputChange = useCallback((id: string, field: keyof AppInput, value: unknown) => {
    const updated = inputs.map((input) =>
      input.id === id ? { ...input, [field]: value } : input
    );
    onInputsChange(updated);
  }, [inputs, onInputsChange]);

  const handleDeleteInput = useCallback((id: string) => {
    onInputsChange(inputs.filter((input) => input.id !== id));
  }, [inputs, onInputsChange]);

  // Output handlers
  const handleAddOutput = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling collapse
    const newOutput: AppOutput = {
      id: nanoid(8),
      key: '',
      type: 'file',
    };
    onOutputsChange([...outputs, newOutput]);
    setIsOutputsExpanded(true); // Auto-expand when adding
  }, [outputs, onOutputsChange]);

  const handleClearOutputs = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm({
      title: '确认清空',
      description: '确定要清空所有输出结果吗？此操作无法撤销。',
      confirmText: '清空',
      cancelText: '取消',
      variant: 'danger',
      onConfirm: () => onOutputsChange([]),
    });
  }, [onOutputsChange, showConfirm]);

  const handleOutputChange = useCallback((id: string, field: keyof AppOutput, value: unknown) => {
    const updated = outputs.map((output) =>
      output.id === id ? { ...output, [field]: value } : output
    );
    onOutputsChange(updated);
  }, [outputs, onOutputsChange]);

  const handleDeleteOutput = useCallback((id: string) => {
    onOutputsChange(outputs.filter((output) => output.id !== id));
  }, [outputs, onOutputsChange]);

  return (
    <div className="space-y-4">
      {/* Inputs Section */}
      <div className="border border-gray-100 rounded-lg bg-white shadow-sm overflow-hidden">
        <div
          className="flex items-center justify-between px-3 py-2 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsInputsExpanded(!isInputsExpanded)}
        >
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
            {isInputsExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-500" />
            输入参数
            <span className="text-xs font-normal text-gray-400 ml-1">({inputs.length})</span>
          </label>
          <div className="flex items-center gap-2">
            {inputs.length > 0 && (
              <button
                onClick={handleClearInputs}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="清空所有"
              >
                <Eraser className="w-3 h-3" />
                清空
              </button>
            )}
            <button
              onClick={handleAddInput}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-white text-emerald-600 border border-emerald-200 rounded hover:bg-emerald-50 transition-colors shadow-sm"
            >
              <Plus className="w-3 h-3" />
              添加
            </button>
          </div>
        </div>

        {isInputsExpanded && (
          <div className="p-2 border-t border-gray-100">
            {inputs.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg bg-gray-50/30">
                暂无输入参数
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {inputs.map((input) => (
                  <div
                    key={input.id}
                    className="p-2 bg-emerald-50/30 border border-emerald-100/60 rounded-md group hover:border-emerald-200 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <FileInput className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />

                      {/* Key Name */}
                      <input
                        type="text"
                        value={input.key}
                        onChange={(e) => handleInputChange(input.id, 'key', e.target.value)}
                        placeholder="参数名称"
                        className="flex-1 min-w-0 text-xs bg-white border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-400"
                      />

                      {/* Type Select */}
                      <select
                        value={input.type}
                        onChange={(e) => handleInputChange(input.id, 'type', e.target.value)}
                        className="w-16 text-[10px] h-6 bg-white border border-gray-200 rounded px-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-600 flex-shrink-0"
                      >
                        {INPUT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {/* Required Toggle */}
                      <label
                        className="flex items-center justify-center w-5 h-5 rounded hover:bg-gray-100 cursor-pointer text-gray-500 flex-shrink-0"
                        title="是否必填"
                      >
                        <input
                          type="checkbox"
                          checked={input.required ?? false}
                          onChange={(e) => handleInputChange(input.id, 'required', e.target.checked)}
                          className="w-3 h-3 rounded text-emerald-500 focus:ring-emerald-500 border-gray-300"
                        />
                      </label>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteInput(input.id)}
                        className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all flex-shrink-0"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Value Input (for non-file types) */}
                    {input.type !== 'file' && (
                      <div className="mt-1.5 ml-[22px]">
                        <input
                          type={input.type === 'number' ? 'number' : 'text'}
                          value={input.value ?? ''}
                          onChange={(e) => handleInputChange(input.id, 'value', e.target.value)}
                          placeholder={input.type === 'number' ? '输入数值' : '输入值'}
                          className="w-full text-xs bg-white border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-300"
                        />
                      </div>
                    )}

                    {/* File Upload (AC3.1) */}
                    {input.type === 'file' && (
                      <div className="mt-1.5 ml-[22px]">
                        {input.fileName ? (
                          <InputFileDisplay
                            fileName={input.fileName}
                            onClear={() => {
                              // Clear all file-related fields in a single call to avoid race condition
                              const updated = inputs.map((inp) =>
                                inp.id === input.id
                                  ? {
                                    ...inp,
                                    fileName: undefined,
                                    fileId: undefined,
                                    value: undefined,
                                  }
                                  : inp
                              );
                              onInputsChange(updated);
                            }}
                          />
                        ) : (
                          <InputFileUpload
                            onFileSelect={(file) => {
                              // Update all file-related fields in a single call to avoid race condition
                              const updated = inputs.map((inp) =>
                                inp.id === input.id
                                  ? {
                                    ...inp,
                                    fileName: file.name,
                                    fileId: `mock-file-${nanoid(8)}`,
                                    value: `mock://${file.name}`,
                                  }
                                  : inp
                              );
                              onInputsChange(updated);
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Outputs Section */}
      <div className="border border-gray-100 rounded-lg bg-white shadow-sm overflow-hidden">
        <div
          className="flex items-center justify-between px-3 py-2 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsOutputsExpanded(!isOutputsExpanded)}
        >
          <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 cursor-pointer">
            {isOutputsExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
            <ArrowUpFromLine className="w-3.5 h-3.5 text-blue-500" />
            输出结果
            <span className="text-xs font-normal text-gray-400 ml-1">({outputs.length})</span>
          </label>
          <div className="flex items-center gap-2">
            {outputs.length > 0 && (
              <button
                onClick={handleClearOutputs}
                className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="清空所有"
              >
                <Eraser className="w-3 h-3" />
                清空
              </button>
            )}
            <button
              onClick={handleAddOutput}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-white text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors shadow-sm"
            >
              <Plus className="w-3 h-3" />
              添加
            </button>
          </div>
        </div>

        {isOutputsExpanded && (
          <div className="p-2 border-t border-gray-100">
            {outputs.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg bg-gray-50/30">
                暂无输出结果
              </div>
            ) : (
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {outputs.map((output) => (
                  <div
                    key={output.id}
                    className="p-2 bg-blue-50/30 border border-blue-100/60 rounded-md group hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <FileOutput className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />

                      {/* Key Name */}
                      <input
                        type="text"
                        value={output.key}
                        onChange={(e) => handleOutputChange(output.id, 'key', e.target.value)}
                        placeholder="输出名称"
                        className="flex-1 min-w-0 text-xs bg-white border border-gray-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
                      />

                      {/* Type Select */}
                      <select
                        value={output.type}
                        onChange={(e) => handleOutputChange(output.id, 'type', e.target.value)}
                        className="w-16 text-[10px] h-6 bg-white border border-gray-200 rounded px-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-600 flex-shrink-0"
                      >
                        {OUTPUT_TYPE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteOutput(output.id)}
                        className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all flex-shrink-0"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Output Value/File Display (AC3.2) */}
                    {output.value && (
                      <div className="mt-1.5 ml-[22px]">
                        {output.type === 'text' ? (
                          <div className="p-1.5 bg-white border border-gray-200 rounded text-xs text-gray-700">
                            {output.value}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-1.5 bg-white border border-gray-200 rounded text-xs">
                            <File className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-gray-700 flex-1 truncate">{output.fileName || '输出文件'}</span>
                            {output.generatedAt && (
                              <span className="text-gray-400 text-[10px]">
                                {new Date(output.generatedAt).toLocaleString()}
                              </span>
                            )}
                            {/* Download Button */}
                            <button
                              onClick={() => {
                                // Mock download
                                const mockContent = `Mock output file for: ${output.fileName}`;
                                const blob = new Blob([mockContent], { type: output.mimeType || 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = output.fileName || 'output.txt';
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                              }}
                              className="p-1 text-blue-500 hover:bg-blue-100 rounded transition-colors"
                              title="下载"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            {/* Preview Button */}
                            {isPreviewableOutput(output) && (
                              <button
                                onClick={() => setPreviewOutput(output)}
                                className="p-1 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                                title="预览"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      <FilePreviewModal
        output={previewOutput}
        onClose={() => setPreviewOutput(null)}
      />
    </div>
  );
}
