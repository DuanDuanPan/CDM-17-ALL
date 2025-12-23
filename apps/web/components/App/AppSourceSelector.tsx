'use client';

/**
 * Story 2.9: APP Source Selector Component
 * Provides tabs for selecting between local, remote, and library app sources
 * Extracted from AppForm.tsx per Tech Spec Section 4.3
 */

import { Folder, Globe, Library, Grid3X3, Plus, Trash2 } from 'lucide-react';
import type { AppSourceType, AppLibraryEntry } from '@cdm/types';

export interface AppSourceSelectorProps {
  sourceType: AppSourceType;
  appPath: string | null;
  appUrl: string | null;
  libraryAppId: string | null;
  libraryAppName: string | null;
  onSourceTypeChange: (sourceType: AppSourceType) => void;
  onAppPathChange: (path: string) => void;
  onAppUrlChange: (url: string) => void;
  onOpenLibrary: () => void;
  onClearLibrary: () => void;
}

const SOURCE_TABS: { value: AppSourceType; label: string; icon: React.ReactNode }[] = [
  { value: 'library', label: '应用库', icon: <Library className="w-4 h-4" /> },
  { value: 'local', label: '本地应用', icon: <Folder className="w-4 h-4" /> },
  { value: 'remote', label: '远程服务', icon: <Globe className="w-4 h-4" /> },
];

export function AppSourceSelector({
  sourceType,
  appPath,
  appUrl,
  libraryAppId,
  libraryAppName,
  onSourceTypeChange,
  onAppPathChange,
  onAppUrlChange,
  onOpenLibrary,
  onClearLibrary,
}: AppSourceSelectorProps) {
  return (
    <div className="space-y-4">
      {/* Source Type Tabs */}
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
          <Grid3X3 className="w-4 h-4 text-cyan-500" />
          应用来源
        </label>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          {SOURCE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onSourceTypeChange(tab.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                sourceType === tab.value
                  ? 'bg-cyan-50 text-cyan-700 font-medium'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Source-specific Configuration */}
      {sourceType === 'library' && (
        <div className="border-t border-gray-200 pt-4">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-3">
            <Library className="w-4 h-4 text-cyan-500" />
            卫星应用库
          </label>

          {libraryAppId ? (
            <div className="flex items-center justify-between p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Grid3X3 className="w-5 h-5 text-cyan-500" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {libraryAppName}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    ID: {libraryAppId}
                  </div>
                </div>
              </div>
              <button
                onClick={onClearLibrary}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="取消选择"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLibrary}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50/50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              从应用库选择
            </button>
          )}
        </div>
      )}

      {sourceType === 'local' && (
        <div className="border-t border-gray-200 pt-4">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
            <Folder className="w-4 h-4 text-cyan-500" />
            本地应用路径
          </label>
          <input
            type="text"
            value={appPath ?? ''}
            onChange={(e) => onAppPathChange(e.target.value)}
            placeholder="例如: matlab://run?script=orbit_design.m"
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">
            输入本地应用的协议路径或可执行文件路径
          </p>
        </div>
      )}

      {sourceType === 'remote' && (
        <div className="border-t border-gray-200 pt-4">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-cyan-500" />
            远程服务 URL
          </label>
          <input
            type="text"
            value={appUrl ?? ''}
            onChange={(e) => onAppUrlChange(e.target.value)}
            placeholder="例如: https://api.satellite-tools.com/v1/analyze"
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent font-mono"
          />
          <p className="text-xs text-gray-500 mt-1">
            输入 Web API 端点 URL
          </p>
        </div>
      )}
    </div>
  );
}
