'use client';

/**
 * Story 2.9: APP Execution State Component
 * Displays current execution status with visual indicators
 */

import { Clock, Loader2, CheckCircle, AlertCircle, Circle } from 'lucide-react';
import type { AppExecutionStatus } from '@cdm/types';

export interface AppExecutionStateProps {
  status: AppExecutionStatus;
  lastExecutedAt?: string | null;
  errorMessage?: string | null;
}

const STATUS_CONFIG: Record<AppExecutionStatus, {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  idle: {
    icon: <Circle className="w-4 h-4" />,
    label: '待执行',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-200',
  },
  running: {
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    label: '执行中',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
  },
  success: {
    icon: <CheckCircle className="w-4 h-4" />,
    label: '执行成功',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  error: {
    icon: <AlertCircle className="w-4 h-4" />,
    label: '执行失败',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
};

export function AppExecutionState({ status, lastExecutedAt, errorMessage }: AppExecutionStateProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 ${config.textColor}`}>
          {config.icon}
          <span className="text-sm font-medium">{config.label}</span>
        </div>

        {lastExecutedAt && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(lastExecutedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {status === 'error' && errorMessage && (
        <div className="mt-2 p-2 bg-red-100/50 rounded text-xs text-red-700">
          {errorMessage}
        </div>
      )}

      {status === 'success' && (
        <div className="mt-2 text-xs text-green-600">
          输出结果已更新
        </div>
      )}
    </div>
  );
}
