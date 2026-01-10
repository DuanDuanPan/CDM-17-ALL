'use client';

import { useTaskAssets } from '../hooks/useTaskAssets';
import type { Deliverable } from '@cdm/types';

interface TaskItemDetailsProps {
  taskId: string;
  deliverables: Deliverable[];
}

export function TaskItemDetails({ taskId, deliverables }: TaskItemDetailsProps) {
  const { assets, isLoading } = useTaskAssets({ selectedTaskId: taskId });

  return (
    <div
      data-testid={`task-details-${taskId}`}
      className="ml-6 mr-2 mb-2 rounded-md border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 px-3 py-2 text-xs text-gray-600"
    >
      <div className="font-medium text-gray-700 dark:text-gray-200">交付物</div>
      {deliverables.length === 0 ? (
        <div className="text-gray-400">无</div>
      ) : (
        <ul className="mt-1 list-disc pl-4">
          {deliverables.slice(0, 5).map((d) => (
            <li key={d.id} className="truncate">
              {d.fileName}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 font-medium text-gray-700 dark:text-gray-200">关联资产</div>
      {isLoading ? (
        <div className="text-gray-400">加载中…</div>
      ) : assets.length === 0 ? (
        <div className="text-gray-400">无</div>
      ) : (
        <ul className="mt-1 list-disc pl-4">
          {assets.slice(0, 5).map((a) => (
            <li key={a.id} className="truncate">
              {a.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

