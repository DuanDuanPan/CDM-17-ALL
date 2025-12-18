'use client';

/**
 * Story 2.1: Common Header Component
 * Displays readonly metadata for all node types
 */

import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { DEFAULT_CREATOR_NAME } from '@/lib/constants';

export interface CommonHeaderProps {
  title: string;
  createdAt?: string;
  updatedAt?: string;
  creator?: string;
}

export function CommonHeader({ title, createdAt, updatedAt, creator }: CommonHeaderProps) {
  const displayCreator = creator || DEFAULT_CREATOR_NAME;
  return (
    <div className="space-y-3 pb-4 border-b border-gray-200">
      {/* Title */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">节点标题</label>
        <div className="text-sm font-medium text-gray-900">{title || '未命名节点'}</div>
      </div>

      {/* Creator */}
      <div>
        <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
          <User className="w-3 h-3" />
          Creator
        </label>
        <div className="text-sm text-gray-700">{displayCreator}</div>
      </div>

      {/* Timestamps */}
      <div className="grid grid-cols-2 gap-3">
        {createdAt && (
          <div>
            <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
              <Calendar className="w-3 h-3" />
              创建时间
            </label>
            <div className="text-xs text-gray-600">
              {format(new Date(createdAt), 'yyyy-MM-dd HH:mm')}
            </div>
          </div>
        )}
        {updatedAt && (
          <div>
            <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
              <Calendar className="w-3 h-3" />
              最后修改
            </label>
            <div className="text-xs text-gray-600">
              {format(new Date(updatedAt), 'yyyy-MM-dd HH:mm')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
