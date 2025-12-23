/**
 * Story 2.3: GanttChart Component
 * dhtmlx-gantt wrapper with React integration
 *
 * Philosophy: This is a PROJECTION of Yjs data.
 * - Receives tasks/links from useGanttData
 * - Renders using dhtmlx-gantt library
 * - Emits events that update Yjs
 *
 * Features:
 * - Zoom levels (day/week/month/quarter)
 * - Drag to reschedule tasks
 * - Resize to change duration
 * - Progress bar drag
 * - Dependency lines between tasks
 */

'use client';

import React, { useEffect, useRef, memo, useState } from 'react';
import type * as Y from 'yjs';
import { useGanttData, type GanttTask, type GanttLink } from './useGanttData';
import {
  useViewStore,
  useGanttState,
  type GanttZoomLevel,
} from '../../stores/useViewStore';

// ==========================================
// Type Definitions
// ==========================================

export interface GanttChartProps {
  /** Yjs document instance */
  yDoc: Y.Doc | null;
  /** Callback when a task is clicked */
  onTaskClick?: (taskId: string) => void;
  /** Callback when a task is double-clicked */
  onTaskDoubleClick?: (taskId: string) => void;
}

// ==========================================
// Zoom Configuration
// ==========================================

const ZOOM_CONFIGS: Record<
  GanttZoomLevel,
  {
    scale_unit: string;
    step: number;
    date_scale: string;
    subscales: Array<{ unit: string; step: number; date: string }>;
    min_column_width: number;
  }
> = {
  day: {
    scale_unit: 'day',
    step: 1,
    date_scale: '%d %M',
    subscales: [{ unit: 'hour', step: 6, date: '%H:00' }],
    min_column_width: 120,
  },
  week: {
    scale_unit: 'week',
    step: 1,
    date_scale: 'Week %W',
    subscales: [{ unit: 'day', step: 1, date: '%d %D' }],
    min_column_width: 50,
  },
  month: {
    scale_unit: 'month',
    step: 1,
    date_scale: '%F %Y',
    subscales: [{ unit: 'week', step: 1, date: 'Week %W' }],
    min_column_width: 30,
  },
  quarter: {
    scale_unit: 'month',
    step: 3,
    date_scale: 'Q%q %Y',
    subscales: [{ unit: 'month', step: 1, date: '%M' }],
    min_column_width: 20,
  },
};

// ==========================================
// Priority Colors
// ==========================================

const PRIORITY_COLORS: Record<string, string> = {
  high: '#F43F5E', // rose-500
  medium: '#F59E0B', // amber-500
  low: '#10B981', // emerald-500
};

const STATUS_COLORS: Record<string, string> = {
  todo: '#94A3B8', // slate-400
  'in-progress': '#3B82F6', // blue-500
  done: '#10B981', // emerald-500
};

// ==========================================
// Component
// ==========================================

/**
 * GanttChart - dhtmlx-gantt wrapper component
 *
 * @example
 * ```tsx
 * const { yDoc } = useCollaboration({ graphId, user });
 *
 * <GanttChart
 *   yDoc={yDoc}
 *   onTaskClick={(taskId) => setSelectedNode(taskId)}
 * />
 * ```
 */
function GanttChartBase({
  yDoc,
  onTaskClick,
  onTaskDoubleClick,
}: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<typeof import('dhtmlx-gantt').gantt | null>(null);
  const isInitializedRef = useRef(false);
  const [isGanttReady, setIsGanttReady] = useState(false);
  const ganttDataRef = useRef<{ tasks: any[]; links: any[] }>({ tasks: [], links: [] });

  // Gantt data from Yjs
  const { tasks, links, unscheduledTasks, totalTasks, updateTaskDates, updateTaskProgress } =
    useGanttData(yDoc);

  // View state
  const ganttState = useGanttState();
  const {
    setGanttZoomLevel,
    toggleGanttRow,
    setShowDependencies,
    setShowUnscheduled,
  } = useViewStore();

  // Initialize dhtmlx-gantt
  useEffect(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    // Dynamic import for dhtmlx-gantt (client-side only)
    const initGantt = async () => {
      const { gantt } = await import('dhtmlx-gantt');
      // @ts-expect-error - CSS import for dhtmlx-gantt
      await import('dhtmlx-gantt/codebase/dhtmlxgantt.css');

      ganttRef.current = gantt;

      // Configure gantt
      configureGantt(gantt, ganttState.zoomLevel);

      // Initialize
      gantt.init(containerRef.current!);
      isInitializedRef.current = true;
      setIsGanttReady(true);

      // Attach event handlers
      gantt.attachEvent('onAfterTaskDrag', (id: string, mode: string) => {
        const task = gantt.getTask(id);
        if (task && task.start_date && task.end_date) {
          updateTaskDates(
            id,
            new Date(task.start_date),
            new Date(task.end_date)
          );
        }
      });

      gantt.attachEvent('onTaskClick', (id: string) => {
        onTaskClick?.(id);
        return true;
      });

      gantt.attachEvent('onTaskDblClick', (id: string) => {
        onTaskDoubleClick?.(id);
        return true;
      });

      gantt.attachEvent('onAfterTaskUpdate', (id: string) => {
        const task = gantt.getTask(id);
        if (task && task.progress !== undefined) {
          // Update progress
          updateTaskProgress(id, task.progress);
        }
      });

      gantt.attachEvent('onTaskOpened', (id: string) => {
        toggleGanttRow(id);
      });

      gantt.attachEvent('onTaskClosed', (id: string) => {
        toggleGanttRow(id);
      });
    };

    initGantt();

    return () => {
      if (ganttRef.current && isInitializedRef.current) {
        ganttRef.current.clearAll();
        isInitializedRef.current = false;
      }
      setIsGanttReady(false);
    };
  }, []);

  // Update zoom level
  useEffect(() => {
    if (!ganttRef.current || !isInitializedRef.current || !isGanttReady) return;

    configureGantt(ganttRef.current, ganttState.zoomLevel);
    ganttRef.current.render();
    ganttRef.current.setSizes();

    if (ganttDataRef.current.tasks.length || ganttDataRef.current.links.length) {
      ganttRef.current.clearAll();
      ganttRef.current.parse({
        data: ganttDataRef.current.tasks,
        links: ganttDataRef.current.links,
      });
      ganttRef.current.render();
      ganttRef.current.setSizes();
    }
  }, [ganttState.zoomLevel]);

  // Update tasks and links
  useEffect(() => {
    if (!ganttRef.current || !isInitializedRef.current) return;

    // Transform to dhtmlx-gantt format
    const ganttTasks = tasks.map((task) => ({
      id: task.id,
      text: task.text,
      start_date: task.start_date,
      end_date: task.end_date,
      duration: task.duration,
      progress: task.progress,
      parent: task.parent,
      open: task.open,
      type: task.type,
      // Custom styling
      color: getTaskColor(task),
      textColor: '#1f2937', // gray-800
      priority: task.priority,
      status: task.status,
    }));

    const ganttLinks = links.map((link) => ({
      id: link.id,
      source: link.source,
      target: link.target,
      type: link.type,
    }));

    ganttDataRef.current = {
      tasks: ganttTasks,
      links: ganttLinks,
    };

    // Parse and load data
    ganttRef.current.clearAll();
    ganttRef.current.parse({
      data: ganttTasks,
      links: ganttLinks,
    });
    ganttRef.current.render();
    ganttRef.current.setSizes();
  }, [tasks, links, isGanttReady]);

  // Loading state
  if (!yDoc) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        正在加载甘特图数据...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar - Premium glassmorphism style */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* Zoom Level */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/80 rounded-lg">
            <span className="text-xs font-medium text-gray-500">视图:</span>
            <div className="flex gap-1">
              {(['day', 'week', 'month', 'quarter'] as GanttZoomLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setGanttZoomLevel(level)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-200 ${ganttState.zoomLevel === level
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                    }`}
                >
                  {level === 'day' ? '日' : level === 'week' ? '周' : level === 'month' ? '月' : '季'}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Buttons */}
          <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/80 rounded-lg cursor-pointer hover:bg-gray-200/60 transition-colors">
            <input
              type="checkbox"
              checked={ganttState.showDependencies}
              onChange={(e) => setShowDependencies(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
            <span className="text-xs font-medium text-gray-600">依赖线</span>
          </label>
          <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/80 rounded-lg cursor-pointer hover:bg-gray-200/60 transition-colors">
            <input
              type="checkbox"
              checked={ganttState.showUnscheduled}
              onChange={(e) => setShowUnscheduled(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
            />
            <span className="text-xs font-medium text-gray-600">未安排</span>
          </label>
        </div>

        {/* Task Count */}
        <div className="text-xs text-gray-500 px-3 py-1.5 bg-gray-100/60 rounded-lg">
          共 <span className="font-semibold text-gray-700">{totalTasks}</span> 个任务
          {unscheduledTasks.length > 0 && (
            <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
              {unscheduledTasks.length} 未安排
            </span>
          )}
        </div>
      </div>

      {/* Gantt Container */}
      <div className="flex-1 flex">
        {/* Unscheduled Tasks Sidebar */}
        {ganttState.showUnscheduled && unscheduledTasks.length > 0 && (
          <div className="w-48 border-r border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="px-3 py-2 border-b border-gray-200">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">
                未安排
              </h4>
            </div>
            <div className="p-2 space-y-2">
              {unscheduledTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-2 bg-white rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:border-blue-300 transition-colors"
                  onClick={() => onTaskClick?.(task.id)}
                >
                  <div className="text-sm font-medium text-gray-700 truncate">
                    {task.text}
                  </div>
                  {task.priority && (
                    <span
                      className="inline-block mt-1 px-1.5 py-0.5 text-xs rounded"
                      style={{
                        backgroundColor: PRIORITY_COLORS[task.priority] + '20',
                        color: PRIORITY_COLORS[task.priority],
                      }}
                    >
                      {task.priority}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Gantt Chart */}
        <div
          ref={containerRef}
          className="flex-1 gantt-container"
          style={{ height: '100%' }}
          data-testid="gantt-container"
        />
      </div>

      {/* Custom Styles */}
      <style jsx global>{`
        /* Main Container Font */
        .gantt-container {
             font-family: inherit;
        }

        /* Grid Headers */
        .gantt-container .gantt_grid_scale,
        .gantt-container .gantt_task_scale {
          background-color: #ffffff;
          border-bottom: 1px solid #e5e7eb;
        }

        .gantt-container .gantt_scale_cell {
          font-weight: 600;
          color: #374151;
          border-right: 1px solid #f3f4f6;
        }
        
        .gantt-container .gantt_grid_head_cell {
           color: #6b7280;
           font-weight: 600;
           font-size: 13px;
           border-right: 1px solid #f3f4f6;
           border-bottom: 1px solid #e5e7eb;
        }

        /* Task Rows */
        .gantt-container .gantt_row {
            border-bottom: 1px solid #f9fafb;
        }
        .gantt-container .gantt_row.odd {
            background-color: #ffffff;
        }
        .gantt-container .gantt_row:hover {
            background-color: #f9fafb;
        }
        
        /* Grid Lines */
        .gantt-container .gantt_task_cell {
            border-right: 1px dashed #f3f4f6;
        }

        /* Task Bars */
        .gantt-container .gantt_task_line {
          border-radius: 12px;
          border: none;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transition: all 0.2s ease;
        }
        
        .gantt-container .gantt_task_line:hover {
             box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.1);
             transform: translateY(-2px);
             z-index: 1000;
        }

        .gantt-container .gantt_task_line.gantt_task_duedate_only {
          border: 2px dashed #9ca3af;
          background-color: transparent !important;
          box-shadow: none;
        }

        .gantt-container .gantt_task_progress {
          background-color: rgba(255, 255, 255, 0.25);
          border-radius: 12px;
        }
        
        /* Task Text */
        .gantt-container .gantt_task_content {
          font-size: 12px;
          font-weight: 600;
          color: white;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
          margin-left: 6px;
        }

        /* Links */
        .gantt-container .gantt_link_line_left,
        .gantt-container .gantt_link_line_right,
        .gantt-container .gantt_link_line_up,
        .gantt-container .gantt_link_line_down {
            background-color: #94a3b8 !important;
        }
        .gantt-container .gantt_link_arrow {
            border-color: #94a3b8 !important;
        }

        /* Tree Content */
        .gantt-container .gantt_tree_content {
            font-size: 13px;
            color: #1f2937;
        }
        
        /* Drag handle helper */
        .gantt_drag_marker {
            opacity: 0.5;
            background-color: #93c5fd;
        }
      `}</style>
    </div>
  );
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Configure dhtmlx-gantt settings
 */
function configureGantt(
  gantt: typeof import('dhtmlx-gantt').gantt,
  zoomLevel: GanttZoomLevel
) {
  const config = ZOOM_CONFIGS[zoomLevel];

  // Time scale
  gantt.config.scale_unit = config.scale_unit;
  gantt.config.step = config.step;
  gantt.config.date_scale = config.date_scale;
  gantt.config.subscales = config.subscales;
  gantt.config.min_column_width = config.min_column_width;

  // General settings
  gantt.config.row_height = 40;
  gantt.config.bar_height = 28;
  gantt.config.fit_tasks = true;
  gantt.config.auto_scheduling = false;
  gantt.config.work_time = true;
  gantt.config.correct_work_time = true;

  // Columns (left panel)
  gantt.config.columns = [
    {
      name: 'text',
      label: '任务名称',
      tree: true,
      width: 180,
      resize: true,
    },
    {
      name: 'start_date',
      label: '开始',
      align: 'center',
      width: 100,
    },
    {
      name: 'end_date',
      label: '结束',
      align: 'center',
      width: 100,
    },
    {
      name: 'duration',
      label: '天数',
      align: 'center',
      width: 50,
    },
  ];

  // Enable features
  gantt.config.drag_links = true;
  gantt.config.drag_progress = true;
  gantt.config.drag_resize = true;
  gantt.config.drag_move = true;

  // Styling
  gantt.config.show_links = true;
  gantt.config.show_markers = true;
  gantt.config.highlight_critical_path = false;

  // Read-only for links (managed by dependency system)
  gantt.config.drag_links = false;

  // Locale (Chinese)
  gantt.locale = {
    date: {
      month_full: [
        '一月', '二月', '三月', '四月', '五月', '六月',
        '七月', '八月', '九月', '十月', '十一月', '十二月',
      ],
      month_short: [
        '1月', '2月', '3月', '4月', '5月', '6月',
        '7月', '8月', '9月', '10月', '11月', '12月',
      ],
      day_full: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],
      day_short: ['日', '一', '二', '三', '四', '五', '六'],
    },
    labels: {
      new_task: '新任务',
      icon_save: '保存',
      icon_cancel: '取消',
      icon_details: '详情',
      icon_edit: '编辑',
      icon_delete: '删除',
      gantt_save_btn: '保存',
      gantt_cancel_btn: '取消',
      gantt_delete_btn: '删除',
      confirm_closing: '',
      confirm_deleting: '确定删除此任务?',
      section_description: '描述',
      section_time: '时间',
      section_type: '类型',
      column_wbs: 'WBS',
      column_text: '任务名称',
      column_start_date: '开始时间',
      column_duration: '持续时间',
      column_add: '',
      link: '关联',
      confirm_link_deleting: '将被删除',
      link_start: '(开始)',
      link_end: '(结束)',
      type_task: '任务',
      type_project: '项目',
      type_milestone: '里程碑',
      minutes: '分钟',
      hours: '小时',
      days: '天',
      weeks: '周',
      months: '月',
      years: '年',
      message_ok: '确定',
      message_cancel: '取消',
      section_constraint: '约束',
      constraint_type: '约束类型',
      constraint_date: '约束日期',
      asap: '尽早',
      alap: '尽晚',
      snet: '不早于...开始',
      snlt: '不晚于...开始',
      fnet: '不早于...结束',
      fnlt: '不晚于...结束',
      mso: '必须在...开始',
      mfo: '必须在...结束',
      resources_filter_placeholder: '搜索',
      resources_filter_label: '隐藏空闲',
      section_deadline: '截止日期',
      section_baselines: '基准',
    },
  };
}

/**
 * Get task bar color based on priority and status
 */
function getTaskColor(task: GanttTask): string {
  // Priority takes precedence
  if (task.priority && PRIORITY_COLORS[task.priority]) {
    return PRIORITY_COLORS[task.priority];
  }

  // Fall back to status color
  if (task.status && STATUS_COLORS[task.status]) {
    return STATUS_COLORS[task.status];
  }

  // Default blue
  return '#3b82f6';
}

export const GanttChart = memo(
  GanttChartBase,
  (prev, next) =>
    prev.yDoc === next.yDoc &&
    prev.onTaskClick === next.onTaskClick &&
    prev.onTaskDoubleClick === next.onTaskDoubleClick
);

GanttChart.displayName = 'GanttChart';

export default GanttChart;
