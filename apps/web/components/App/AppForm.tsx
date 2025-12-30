'use client';

/**
 * Story 2.9: APP Node Form
 * Form for APP (Application) node properties
 * Supports local, remote, and library application sources
 *
 * Story 7.5: Refactored to use Hook-First pattern
 * - Removed 1 direct fetch() call for app execution
 * - Now uses useAppLibrary hook following Story 7.2 pattern
 */

import { useState, useEffect, useCallback } from 'react';
import { Box, Play, Loader2 } from 'lucide-react';
import type { AppProps, AppInput, AppOutput, AppSourceType, AppExecutionStatus, AppLibraryEntry } from '@cdm/types';
import { useAppLibrary as useAppLibraryContext } from '@/contexts';
import { AppIOConfig } from './AppIOConfig';
import { AppExecutionState } from './AppExecutionState';
import { AppSourceSelector } from './AppSourceSelector';
import { buildLibraryDefaults } from './app-utils';
import { useAppLibrary as useAppLibraryApi } from '@/hooks/useAppLibrary';

export interface AppFormProps {
  nodeId: string;
  initialData?: AppProps;
  onUpdate?: (data: AppProps) => void;
}

export function AppForm({ nodeId, initialData, onUpdate }: AppFormProps) {
  const { openAppLibrary } = useAppLibraryContext();
  const { execute, isExecuting } = useAppLibraryApi();

  const [formData, setFormData] = useState<AppProps>({
    appSourceType: initialData?.appSourceType || 'library',
    appPath: initialData?.appPath || null,
    appUrl: initialData?.appUrl || null,
    libraryAppId: initialData?.libraryAppId || null,
    libraryAppName: initialData?.libraryAppName || null,
    inputs: initialData?.inputs || [],
    outputs: initialData?.outputs || [],
    executionStatus: initialData?.executionStatus || 'idle',
    lastExecutedAt: initialData?.lastExecutedAt || null,
    errorMessage: initialData?.errorMessage || null,
  });

  useEffect(() => {
    setFormData({
      appSourceType: initialData?.appSourceType || 'library',
      appPath: initialData?.appPath || null,
      appUrl: initialData?.appUrl || null,
      libraryAppId: initialData?.libraryAppId || null,
      libraryAppName: initialData?.libraryAppName || null,
      inputs: initialData?.inputs || [],
      outputs: initialData?.outputs || [],
      executionStatus: initialData?.executionStatus || 'idle',
      lastExecutedAt: initialData?.lastExecutedAt || null,
      errorMessage: initialData?.errorMessage || null,
    });
  }, [initialData]);

  const handleFieldChange = useCallback((field: keyof AppProps, value: unknown) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    onUpdate?.(updatedData);
  }, [formData, onUpdate]);

  const handleSourceTypeChange = useCallback((sourceType: AppSourceType) => {
    const updatedData: AppProps = {
      ...formData,
      appSourceType: sourceType,
      // Clear source-specific fields when switching
      appPath: sourceType === 'local' ? formData.appPath : null,
      appUrl: sourceType === 'remote' ? formData.appUrl : null,
      libraryAppId: sourceType === 'library' ? formData.libraryAppId : null,
      libraryAppName: sourceType === 'library' ? formData.libraryAppName : null,
    };
    setFormData(updatedData);
    onUpdate?.(updatedData);
  }, [formData, onUpdate]);

  // Library selection handler - now uses global dialog via context
  const handleLibrarySelect = useCallback((entry: AppLibraryEntry) => {
    const { inputs, outputs } = buildLibraryDefaults(entry);

    const updatedData: AppProps = {
      ...formData,
      appSourceType: 'library',
      libraryAppId: entry.id,
      libraryAppName: entry.name,
      inputs,
      outputs,
      executionStatus: 'idle',
      errorMessage: null,
    };
    setFormData(updatedData);
    onUpdate?.(updatedData);
  }, [formData, onUpdate]);

  // Open global library dialog
  const handleOpenLibrary = useCallback(() => {
    openAppLibrary(handleLibrarySelect);
  }, [openAppLibrary, handleLibrarySelect]);

  // Input/Output update handlers
  const handleInputsChange = useCallback((inputs: AppInput[]) => {
    const updatedData = { ...formData, inputs };
    setFormData(updatedData);
    onUpdate?.(updatedData);
  }, [formData, onUpdate]);

  const handleOutputsChange = useCallback((outputs: AppOutput[]) => {
    const updatedData = { ...formData, outputs };
    setFormData(updatedData);
    onUpdate?.(updatedData);
  }, [formData, onUpdate]);

  /**
   * Execute the APP based on source type (AC4.1)
   * - Local: Trigger protocol handler (mock alert)
   * - Remote/Library: Call mock API via backend executor
   *
   * ISSUE-6: Running status is transient (local only), success/error is persisted
   */
  const handleExecute = useCallback(async () => {
    if (isExecuting) return;

    // Set running state locally only (transient - not persisted)
    setFormData((prev) => ({
      ...prev,
      executionStatus: 'running' as AppExecutionStatus,
      errorMessage: null,
    }));
    // NOTE: Do NOT call onUpdate here - running state is transient

    if (formData.appSourceType === 'local' && formData.appPath) {
      window.alert(
        `本地应用启动请求 (Mock):\n${formData.appPath}\n\n需要 OS 协议处理器支持。`
      );
    }

    try {
      const result = await execute(nodeId, {
        appSourceType: formData.appSourceType || 'library',
        appPath: formData.appPath ?? null,
        appUrl: formData.appUrl ?? null,
        libraryAppId: formData.libraryAppId ?? null,
        libraryAppName: formData.libraryAppName ?? null,
        inputs: formData.inputs || [],
        outputs: formData.outputs || [],
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      const successData: AppProps = {
        ...formData,
        outputs: result.outputs || [],
        executionStatus: 'success' as AppExecutionStatus,
        lastExecutedAt: result.executedAt ?? new Date().toISOString(),
        errorMessage: null,
      };
      setFormData(successData);
      onUpdate?.(successData);
    } catch (err) {
      const message = err instanceof Error ? err.message : '执行失败';
      const errorData: AppProps = {
        ...formData,
        executionStatus: 'error' as AppExecutionStatus,
        errorMessage: message,
        lastExecutedAt: new Date().toISOString(),
      };
      setFormData(errorData);
      onUpdate?.(errorData);
    }
  }, [formData, onUpdate, isExecuting, nodeId, execute]);

  // Clear library selection
  const handleClearLibrary = useCallback(() => {
    const updatedData: AppProps = {
      ...formData,
      libraryAppId: null,
      libraryAppName: null,
      inputs: [],
      outputs: [],
      executionStatus: 'idle',
    };
    setFormData(updatedData);
    onUpdate?.(updatedData);
  }, [formData, onUpdate]);

  return (
    <div className="space-y-5">
      {/* Source Selection - extracted component per Tech Spec 4.3 */}
      <AppSourceSelector
        sourceType={formData.appSourceType || 'library'}
        appPath={formData.appPath ?? null}
        appUrl={formData.appUrl ?? null}
        libraryAppId={formData.libraryAppId ?? null}
        libraryAppName={formData.libraryAppName ?? null}
        onSourceTypeChange={handleSourceTypeChange}
        onAppPathChange={(path) => handleFieldChange('appPath', path)}
        onAppUrlChange={(url) => handleFieldChange('appUrl', url)}
        onOpenLibrary={handleOpenLibrary}
        onClearLibrary={handleClearLibrary}
      />

      {/* I/O Configuration */}
      <AppIOConfig
        inputs={formData.inputs || []}
        outputs={formData.outputs || []}
        onInputsChange={handleInputsChange}
        onOutputsChange={handleOutputsChange}
      />

      {/* Execution State and Control */}
      <div className="border-t border-gray-200 pt-4">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
          <Play className="w-4 h-4 text-cyan-500" />
          执行控制
        </label>

        <AppExecutionState
          status={formData.executionStatus || 'idle'}
          lastExecutedAt={formData.lastExecutedAt}
          errorMessage={formData.errorMessage}
        />

        <button
          onClick={handleExecute}
          disabled={isExecuting || (!formData.libraryAppId && !formData.appPath && !formData.appUrl)}
          className={`w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isExecuting
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : formData.executionStatus === 'running'
              ? 'bg-yellow-100 text-yellow-700 cursor-not-allowed'
              : 'bg-cyan-500 text-white hover:bg-cyan-600'
            }`}
        >
          {isExecuting || formData.executionStatus === 'running' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              执行中...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              启动应用
            </>
          )}
        </button>
      </div>

      {/* Info Badge */}
      <div className="mt-4 p-3 bg-cyan-50 rounded-md">
        <div className="flex items-center gap-2 text-xs text-cyan-700">
          <Box className="w-4 h-4" />
          <span className="font-medium">工业应用 (APP)</span>
        </div>
        {formData.libraryAppName && (
          <div className="mt-2 text-xs text-gray-600">
            应用: <span className="font-medium">{formData.libraryAppName}</span>
          </div>
        )}
      </div>

      {/* Note: AppLibraryDialog is now rendered globally via AppLibraryProvider */}
    </div>
  );
}
