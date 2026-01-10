/**
 * Story 9.2: Task Group View Component
 * Displays TASK nodes grouped by status (todo, in-progress, done)
 * AC#2: View 2 shows tasks grouped by status with deliverables
 */

'use client';

import {
  CheckCircle2,
  Circle,
  Clock,
  ChevronRight,
  ChevronDown,
  ListTodo,
  Paperclip,
} from 'lucide-react';
import { cn } from '@cdm/ui';
import { useTaskNodes, type TaskNode } from '../hooks/useTaskNodes';
import { TaskItemDetails } from './TaskItemDetails';
import type { TaskStatus } from '@cdm/types';

interface TaskGroupViewProps {
  /** Currently selected task ID */
  selectedId: string | null;
  /** Callback when a task is selected */
  onSelect: (id: string | null) => void;
  /** Expanded status groups (AC#5) */
  expandedGroups: Set<TaskStatus>;
  /** Toggle expand/collapse for a status group (AC#5) */
  onToggleGroup: (status: TaskStatus) => void;
}

/**
 * Status group configuration
 */
const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  'todo': {
    label: '待办',
    icon: Circle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-50 dark:bg-gray-800/50',
  },
  'in-progress': {
    label: '进行中',
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  'done': {
    label: '已完成',
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
  },
};

const STATUS_ORDER: TaskStatus[] = ['todo', 'in-progress', 'done'];

/**
 * Task Group View - displays tasks grouped by status
 */
export function TaskGroupView({
  selectedId,
  onSelect,
  expandedGroups,
  onToggleGroup,
}: TaskGroupViewProps) {
  const { tasksByStatus, totalCount } = useTaskNodes();

  // Empty state
  if (totalCount === 0) {
    return (
      <div
        data-testid="empty-state-task"
        className="flex flex-col items-center justify-center h-full py-12 text-gray-400"
      >
        <ListTodo className="w-12 h-12 mb-4 opacity-20" />
        <p className="text-sm font-medium">暂无任务节点</p>
        <p className="text-xs mt-1 text-gray-400">
          在脑图中创建 TASK 节点后，它们将显示在这里
        </p>
      </div>
    );
  }

  return (
    <div data-testid="task-group-view" className="flex flex-col h-full">
      {/* Status groups */}
      <div className="flex-1 overflow-y-auto py-2">
        {STATUS_ORDER.map((status) => (
          <TaskStatusGroup
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            isExpanded={expandedGroups.has(status)}
            onToggle={() => onToggleGroup(status)}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>

      {/* Summary footer */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
        共 {totalCount} 个任务
      </div>
    </div>
  );
}

/**
 * Task status group component
 */
interface TaskStatusGroupProps {
  status: TaskStatus;
  tasks: TaskNode[];
  isExpanded: boolean;
  onToggle: () => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

function TaskStatusGroup({
  status,
  tasks,
  isExpanded,
  onToggle,
  selectedId,
  onSelect,
}: TaskStatusGroupProps) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  return (
    <div data-testid={`task-group-${status}`} className="mb-1">
      {/* Group header */}
      <button
        type="button"
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left',
          'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150',
          config.bgColor
        )}
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        <StatusIcon className={cn('w-4 h-4', config.color)} />
        <span className="text-sm font-medium flex-1">{config.label}</span>
        <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </button>

      {/* Task list */}
      {isExpanded && tasks.length > 0 && (
        <div data-testid={`task-group-items-${status}`} className="pl-2">
          {tasks.map((task) => {
            const isSelected = selectedId === task.id;
            return (
              <div key={task.id}>
                <TaskItem task={task} isSelected={isSelected} onSelect={onSelect} />
                {isSelected && (
                  <TaskItemDetails
                    taskId={task.id}
                    deliverables={task.deliverables ?? []}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Individual task item
 */
interface TaskItemProps {
  task: TaskNode;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}

function TaskItem({ task, isSelected, onSelect }: TaskItemProps) {
  const handleClick = () => {
    onSelect(isSelected ? null : task.id);
  };

  const deliverableCount = task.deliverables?.length ?? 0;

  return (
    <div
      data-testid={`task-item-${task.id}`}
      className={cn(
        'flex items-center gap-2 px-3 py-2 cursor-pointer rounded',
        'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150',
        isSelected && 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
      )}
      onClick={handleClick}
    >
      {/* Priority indicator */}
      {task.priority && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            task.priority === 'high' && 'bg-red-500',
            task.priority === 'medium' && 'bg-yellow-500',
            task.priority === 'low' && 'bg-gray-400'
          )}
          title={`优先级: ${task.priority}`}
        />
      )}

      {/* Task label */}
      <span className="text-sm truncate flex-1">{task.label}</span>

      {/* Deliverable indicator */}
      {deliverableCount > 0 && (
        <span
          className="flex items-center gap-0.5 text-xs text-gray-400"
          title={`${deliverableCount} 个交付物`}
        >
          <Paperclip className="w-3 h-3" />
          {deliverableCount}
        </span>
      )}

      {/* Due date */}
      {task.dueDate && (
        <span className="text-xs text-gray-400">
          {formatDueDate(task.dueDate)}
        </span>
      )}
    </div>
  );
}

/**
 * Format due date for display
 */
function formatDueDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil(
      (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      return `已过期 ${Math.abs(diffDays)} 天`;
    } else if (diffDays === 0) {
      return '今天';
    } else if (diffDays === 1) {
      return '明天';
    } else if (diffDays <= 7) {
      return `${diffDays} 天后`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      });
    }
  } catch {
    return dateStr;
  }
}
