'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Node } from '@antv/x6';
import {
  CheckCircle,
  FileText,
  Box,
  Database,
  MoreHorizontal,
  Lock,
  AlertCircle,
  Clock,
  Grid3X3, // Story 2.9: APP node icon
  Play, // Story 2.9: APP execution
  Loader2, // Story 2.9: APP running state
  MessageSquare, // Story 4.3: Comments
  Eye, // Story 4.4: Subscription indicator
} from 'lucide-react';
import { NodeType, type TaskProps, type RequirementProps, type PBSProps, type DataProps, type AppProps, type AppOutput, type AppExecutionStatus, type ApprovalStatus, type ApprovalPipeline } from '@cdm/types';
import type { MindNodeData } from '@cdm/types';
import { updateNode, updateNodeProps } from '@/lib/api/nodes';
import { getUnreadCount as getGlobalUnreadCount, subscribe as subscribeToUnreadCounts } from '@/lib/commentCountStore';
import { isSubscribed as isNodeSubscribed, subscribe as subscribeToSubscriptionStore } from '@/lib/subscriptionStore';
// Rich Node UI components
import { RichNodeLayout } from './rich/RichNodeLayout';
import { TitleRow } from './rich/TitleRow';
import { MetricsRow } from './rich/MetricsRow';
import { HangingPill } from './rich/HangingPill';
import { Footer, getNodeRenderer } from './rich'; // Kept from original as getNodeRenderer is used

type MindNodeOperation = 'addChild' | 'addSibling';

export interface MindNodeProps {
  node: Node;
}

const DEFAULT_DATA: MindNodeData = {
  id: '',
  label: '',
  description: '',
  isEditing: false,
  isSelected: false,
};

function dispatchNodeOperation(
  el: HTMLElement,
  action: MindNodeOperation,
  nodeId: string
) {
  el.dispatchEvent(
    new CustomEvent('mindmap:node-operation', {
      bubbles: true,
      detail: { action, nodeId },
    })
  );
}

// Dispatch batch-stop event to finalize undo grouping after node creation+editing
function dispatchBatchStop(el: HTMLElement, nodeId: string) {
  el.dispatchEvent(
    new CustomEvent('mindmap:batch-stop', {
      bubbles: true,
      detail: { nodeId },
    })
  );
}

// Helpers for semantic styling
const getTypeConfig = (type: NodeType, isDone: boolean = false) => {
  if (isDone) {
    return {
      borderColor: 'border-emerald-200',
      bgColor: 'bg-emerald-50/80',
      shadowColor: 'shadow-emerald-900/5',
      accentColor: 'text-emerald-600',
      icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
      pill: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Done' }
    };
  }

  switch (type) {
    case NodeType.TASK:
      return {
        borderColor: 'border-emerald-400',
        bgColor: 'bg-white/90',
        shadowColor: 'shadow-emerald-500/20',
        accentColor: 'text-emerald-600',
        icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
        pill: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Todo' }
      };
    case NodeType.REQUIREMENT:
      return {
        borderColor: 'border-violet-400',
        bgColor: 'bg-white/90',
        shadowColor: 'shadow-violet-500/20',
        accentColor: 'text-violet-600',
        icon: <FileText className="w-5 h-5 text-violet-500" />,
        pill: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Must Have' }
      };
    case NodeType.PBS:
      return {
        borderColor: 'border-sky-400',
        bgColor: 'bg-white/90',
        shadowColor: 'shadow-sky-500/20',
        accentColor: 'text-sky-600',
        icon: <Box className="w-5 h-5 text-sky-500" />,
        pill: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'v1.0' }
      };
    case NodeType.DATA:
      return {
        borderColor: 'border-amber-400',
        bgColor: 'bg-white/90',
        shadowColor: 'shadow-amber-500/20',
        accentColor: 'text-amber-600',
        icon: <Database className="w-5 h-5 text-amber-500" />,
        pill: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Internal' }
      };
    // Story 2.9: APP node styling
    case NodeType.APP:
      return {
        borderColor: 'border-cyan-400',
        bgColor: 'bg-white/90',
        shadowColor: 'shadow-cyan-500/20',
        accentColor: 'text-cyan-600',
        icon: <Grid3X3 className="w-5 h-5 text-cyan-500" />,
        pill: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'App' }
      };
    default: // ORDINARY
      return {
        borderColor: 'border-gray-200',
        bgColor: 'bg-white',
        shadowColor: 'shadow-sm',
        accentColor: 'text-gray-600',
        icon: null,
        pill: null
      };
  }
};

// Story 4.1: Get approval status decoration styles
const getApprovalDecoration = (approvalStatus: ApprovalStatus | undefined) => {
  switch (approvalStatus) {
    case 'PENDING':
      return {
        // 审批中: 橙黄色条纹 Header（由 RichNodeLayout 控制） + 同色系徽标
        containerClass: 'border-2 border-dashed border-amber-400 bg-amber-50/30',
        badgeClass: 'bg-amber-100 text-amber-800',
        badgeText: '待审批',
      };
    case 'APPROVED':
      return {
        // 已通过: 绿色实线边框
        containerClass: 'border-2 border-solid border-emerald-500 bg-emerald-50/10',
        badgeClass: 'bg-emerald-100 text-emerald-700',
        badgeText: '已通过',
      };
    case 'REJECTED':
      return {
        // 已驳回: 红色实线边框 + 阴影警示
        containerClass: 'border-2 border-solid border-rose-500 bg-rose-50/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
        badgeClass: 'bg-rose-100 text-rose-700',
        badgeText: '已驳回',
      };
    default:
      return null;
  }
};

const NODE_WIDTH = 220;

export function MindNode({ node }: MindNodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLInputElement>(null);
  // Separate refs for measuring title and description
  const titleMeasureRef = useRef<HTMLDivElement>(null);
  const descMeasureRef = useRef<HTMLDivElement>(null);

  const getData = useCallback((): MindNodeData => {
    return (node?.getData() as MindNodeData) ?? DEFAULT_DATA;
  }, [node]);

  const [isEditing, setIsEditing] = useState(() => !!getData().isEditing);
  const [isSelected, setIsSelected] = useState(() => !!getData().isSelected);

  // State for content
  const [label, setLabel] = useState(() => getData().label ?? '');
  const [description, setDescription] = useState(() => getData().description ?? '');

  // Story 2.6 Fix: State for tags to trigger re-render when tags change
  const [tags, setTags] = useState<string[]>(() => getData().tags ?? []);
  // Story 2.9: Local-only execution state (do not sync running status)
  const [appRunning, setAppRunning] = useState(false);

  // Story 4.3: Unread comment indicator (AC4)
  // Use global store instead of Context because X6 renders via portal outside React tree
  const [unreadCount, setUnreadCount] = useState(() => getGlobalUnreadCount(node.id));

  // Subscribe to unread count changes from global store
  useEffect(() => {
    const unsubscribe = subscribeToUnreadCounts(() => {
      setUnreadCount(getGlobalUnreadCount(node.id));
    });
    return unsubscribe;
  }, [node.id]);

  // Story 4.4: Subscription indicator state
  const [isWatched, setIsWatched] = useState(() => isNodeSubscribed(node.id));

  // Subscribe to subscription store changes
  useEffect(() => {
    const unsubscribe = subscribeToSubscriptionStore(() => {
      setIsWatched(isNodeSubscribed(node.id));
    });
    return unsubscribe;
  }, [node.id]);

  // Sync state with node data
  useEffect(() => {
    if (!node) return;
    const onDataChange = () => {
      const data = (node.getData() as MindNodeData) ?? DEFAULT_DATA;
      setIsEditing(!!data.isEditing);
      setIsSelected(!!data.isSelected);
      // Story 2.6 Fix: Always update tags to ensure UI reflects changes
      setTags(data.tags ?? []);
      if (data.nodeType !== NodeType.APP) {
        setAppRunning(false);
      }
      if (!data.isEditing) {
        setLabel(data.label ?? '');
        setDescription(data.description ?? '');
      }
    };
    node.on('change:data', onDataChange);
    return () => {
      node.off('change:data', onDataChange);
    };
  }, [node]);

  // Focus management
  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditing]);

  // Derived state for styling
  const data = getData();
  const nodeType = data.nodeType || NodeType.ORDINARY;
  const taskProps = data.props as TaskProps | undefined;
  const isTaskDone = nodeType === NodeType.TASK && taskProps?.status === 'done';
  const styles = getTypeConfig(nodeType, isTaskDone);

  // Story 2.4: Assignment status indicator
  const assignmentStatus = taskProps?.assignmentStatus;
  const showAssignmentIndicator = nodeType === NodeType.TASK && assignmentStatus && assignmentStatus !== 'idle';

  // Story 4.1: Approval status decoration
  // Note: approval is stored at Node level (data.approval), NOT in data.props
  const approval = data.approval as ApprovalPipeline | undefined;
  const approvalStatus = approval?.status;

  const approvalDecoration = getApprovalDecoration(approvalStatus);

  // Dynamic pills based on props
  let pill = styles.pill;
  if (nodeType === NodeType.REQUIREMENT) {
    const priority = (data.props as RequirementProps)?.priority;
    if (priority) pill = { ...pill!, label: priority.charAt(0).toUpperCase() + priority.slice(1) };
  } else if (nodeType === NodeType.PBS) {
    const pbsProps = data.props as PBSProps;
    const productCode = pbsProps?.productRef?.productCode;
    const version = pbsProps?.version;
    // Story 2.7: Prefer productCode from linked product, with indigo styling
    if (productCode) {
      pill = { bg: 'bg-indigo-100', text: 'text-indigo-700', label: productCode };
    } else if (version) {
      pill = { ...pill!, label: version };
    }
  } else if (nodeType === NodeType.DATA) {
    const secretLevel = (data.props as DataProps)?.secretLevel;
    if (secretLevel) pill = { ...pill!, label: secretLevel.charAt(0).toUpperCase() + secretLevel.slice(1) };
  } else if (nodeType === NodeType.APP) {
    // Story 2.9: APP node execution status pill
    const appProps = data.props as AppProps;
    const executionStatus: AppExecutionStatus | undefined = appRunning ? 'running' : appProps?.executionStatus;
    const appName = appProps?.libraryAppName;

    if (executionStatus === 'running') {
      pill = { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '执行中' };
    } else if (executionStatus === 'success') {
      pill = { bg: 'bg-green-100', text: 'text-green-700', label: '成功' };
    } else if (executionStatus === 'error') {
      pill = { bg: 'bg-red-100', text: 'text-red-700', label: '失败' };
    } else if (appName) {
      pill = { ...pill!, label: appName };
    }
  }

  // Auto-resize logic - OPTIMIZED FOR FIXED WIDTH
  useLayoutEffect(() => {
    // Force fixed width for ALL nodes to ensure grid alignment
    if (!containerRef.current || !node) return;

    const container = containerRef.current;
    // Use offset* to avoid transform feedback loops (e.g. selected scale, graph zoom)
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    const renderer = getNodeRenderer(nodeType);

    if (renderer) {
      // Rich Node (PBS, Task, Requirement, App, Data): Fixed 240px width
      const RICH_NODE_WIDTH = 240;
      const minHeight = 100;
      const newHeight = Math.max(height + 8, minHeight); // +8 for padding buffer

      // Only resize if dimensions actually changed (prevent layout thrashing)
      const currentSize = node.getSize();
      if (currentSize.width !== RICH_NODE_WIDTH || Math.abs(currentSize.height - newHeight) > 2) {
        node.resize(RICH_NODE_WIDTH, newHeight);
      }
    } else {
      // Legacy nodes (ORDINARY): Keep existing logic
      const newWidth = nodeType === NodeType.ORDINARY ? width : Math.max(width, 180);
      const newHeight = Math.max(height, nodeType === NodeType.ORDINARY ? 40 : 80);

      const currentSize = node.getSize();
      if (Math.abs(currentSize.width - newWidth) > 2 || Math.abs(currentSize.height - newHeight) > 2) {
        node.resize(newWidth, newHeight);
      }
    }
  }, [
    node,
    label,
    description,
    tags,
    nodeType,
    isTaskDone,
    approvalDecoration,
    // Don't include renderer itself to avoid infinite loops
  ]);

  const focusGraphContainer = useCallback(() => {
    // Ensure browse-mode shortcuts (Enter/Tab) keep working after commit/cancel.
    const el = document.getElementById('graph-container') as HTMLElement | null;
    el?.focus();
    // Safety net for async React updates
    requestAnimationFrame(() => {
      document.getElementById('graph-container')?.focus();
    });
  }, []);

  const startEditing = useCallback(() => {
    const prevData = getData();
    setIsEditing(true);
    node.setData({ ...prevData, isEditing: true } as Partial<MindNodeData>);
  }, [getData, node]);

  const commit = useCallback(() => {
    // Dispatch batch-stop event to finalize undo grouping (if this node was just created)
    const el = containerRef.current;
    if (el) {
      dispatchBatchStop(el, node.id);
    }

    // Get previous data to check if label changed
    const prevData = getData();
    const labelChanged = label !== prevData.label;
    const descriptionChanged = description !== (prevData.description ?? '');

    // CRITICAL: Preserve ALL existing node data when updating label/description
    // X6's setData() REPLACES data, so we must spread existing data first
    // Story 2.6 Fix: Prevents loss of nodeType, props, tags when editing label
    node.setData({
      ...prevData,  // Preserve existing nodeType, props, tags, parentId, etc.
      label,
      description,
      isEditing: false,
      updatedAt: new Date().toISOString(),
    } as Partial<MindNodeData>);
    setIsEditing(false);

    // Sync to database if changed
    if ((labelChanged || descriptionChanged) && node.id) {
      const payload: { label?: string; description?: string } = {};
      if (labelChanged) payload.label = label;
      if (descriptionChanged) payload.description = description;

      updateNode(node.id, payload).catch((err) => {
        console.error('[MindNode] Failed to sync node to database:', err);
      });
    }
  }, [node, label, description, getData]);

  const cancel = useCallback(() => {
    // Dispatch batch-stop event to finalize undo grouping (if this node was just created)
    const el = containerRef.current;
    if (el) {
      dispatchBatchStop(el, node.id);
    }

    const d = getData();
    setLabel(d.label ?? '');
    setDescription(d.description ?? '');
    // CRITICAL: Preserve ALL existing node data when canceling edit
    // X6's setData() REPLACES data, so we must spread existing data first
    node.setData({ ...d, isEditing: false } as Partial<MindNodeData>);
    setIsEditing(false);
  }, [getData, node]);

  // Handle keyboard events (similar to before but adapted for 2 inputs)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { // Allow shift+enter for multiline description? maybe later
      e.preventDefault(); e.stopPropagation();
      commit();
      focusGraphContainer();
    } else if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation();
      cancel();
      focusGraphContainer();
    } else if (e.key === 'Tab') {
      e.preventDefault(); e.stopPropagation();
      commit();
      // Add child logic...
      const el = containerRef.current;
      if (el) dispatchNodeOperation(el, 'addChild', node.id);
      // We don't strictly need to focus graph container here because the new node will take focus?
      // Actually, AddChildCommand creates a new node which auto-focuses.
      // But wait, if we focus container, and then new node mounts and steals focus, that's fine.
      focusGraphContainer();
    }
  };

  const handleAppExecute = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (appRunning) return;
      const data = getData();
      if ((data.nodeType || NodeType.ORDINARY) !== NodeType.APP) return;

      const appProps = (data.props as AppProps) || {};
      setAppRunning(true);

      if (appProps.appSourceType === 'local' && appProps.appPath) {
        window.alert(
          `本地应用启动请求 (Mock):\n${appProps.appPath}\n\n需要 OS 协议处理器支持。`
        );
      }

      try {
        const response = await fetch(`/api/nodes/${node.id}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appSourceType: appProps.appSourceType ?? 'library',
            appPath: appProps.appPath,
            appUrl: appProps.appUrl,
            libraryAppId: appProps.libraryAppId,
            libraryAppName: appProps.libraryAppName,
            inputs: appProps.inputs || [],
            outputs: appProps.outputs || [],
          }),
        });

        if (!response.ok) {
          throw new Error(`执行失败：${response.status}`);
        }

        const result: { outputs: AppOutput[]; error?: string; executedAt: string } = await response.json();
        if (result?.error) {
          throw new Error(result.error);
        }

        const successProps: AppProps = {
          ...appProps,
          outputs: result.outputs || [],
          executionStatus: 'success' as AppExecutionStatus,
          lastExecutedAt: result.executedAt ?? new Date().toISOString(),
          errorMessage: null,
        };

        const prevData = node.getData() || {};
        node.setData({
          ...prevData,
          props: successProps,
          updatedAt: new Date().toISOString(),
        } as Partial<MindNodeData>);

        updateNodeProps(node.id, NodeType.APP, successProps).catch((err) => {
          console.error('[MindNode] Failed to persist APP execution props:', err);
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : '执行失败';
        const errorProps: AppProps = {
          ...appProps,
          executionStatus: 'error' as AppExecutionStatus,
          errorMessage: message,
          lastExecutedAt: new Date().toISOString(),
        };
        const prevData = node.getData() || {};
        node.setData({
          ...prevData,
          props: errorProps,
          updatedAt: new Date().toISOString(),
        } as Partial<MindNodeData>);

        updateNodeProps(node.id, NodeType.APP, errorProps).catch((err) => {
          console.error('[MindNode] Failed to persist APP execution props:', err);
        });
      } finally {
        setAppRunning(false);
      }
    },
    [appRunning, getData, node]
  );

  // Story 4.3: Open comments panel
  const handleOpenComments = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const el = containerRef.current;
      if (el) {
        // Dispatch custom event to open comments panel
        window.dispatchEvent(
          new CustomEvent('mindmap:open-comments', {
            detail: { nodeId: node.id, nodeLabel: label },
          })
        );
      }
    },
    [node.id, label]
  );

  /* 
    Story 4.1: Enhanced Visualization Strategy
    If approval decoration exists, it overrides the default border color and bg color.
    Selection ring is added on top of the approval border if selected.
  */
  const containerClasses = `
    relative flex flex-col w-full h-full transition-all duration-200
    backdrop-blur-sm
    ${approvalDecoration
      ? `${approvalDecoration.containerClass} ${isSelected ? 'ring-2 ring-blue-500 z-10' : ''}`
      : `${styles.bgColor} ${isSelected ? 'ring-2 ring-blue-500 border-transparent z-10' : `border ${styles.borderColor}`}`
    }
    ${isSelected && !approvalDecoration ? 'shadow-md scale-[1.01]' : 'shadow-sm hover:shadow-md'}
    ${nodeType === NodeType.ORDINARY ? 'rounded px-3 py-1.5 items-center justify-center' : 'rounded-lg p-2 justify-between'}
  `;

  // === RENDER IMPL ===

  // 1. ORDINARY NODE RENDERING
  if (nodeType === NodeType.ORDINARY) {
    return (
      <div
        ref={containerRef}
        className={`${containerClasses} relative`}
        onDoubleClick={startEditing}
      >
        {/* Story 4.4: Subscription indicator badge - top right */}
        {isWatched && (
          <div
            className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm z-10"
            title="已关注"
          >
            <Eye className="w-2.5 h-2.5 text-white" />
          </div>
        )}

        {/* Measures */}
        <div ref={titleMeasureRef} className="absolute opacity-0 pointer-events-none text-sm font-medium px-2 text-center w-full break-words">
          {label || 'New Topic'}
        </div>

        {isEditing ? (
          <input
            ref={titleInputRef}
            value={label}
            onChange={e => setLabel(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-center text-sm font-medium text-gray-900 outline-none placeholder-gray-300"
            placeholder="New Topic"
          />
        ) : (
          <span className="text-sm font-medium text-gray-700 text-center break-words w-full">
            {label || 'New Topic'}
          </span>
        )}
      </div>
    );
  }

  // 2. RICH NODE RENDERING (PBS, Task) - NEW UI
  const renderer = getNodeRenderer(nodeType);
  if (renderer) {
    const headerColor = renderer.getHeaderColor(approvalStatus);
    const headerPattern = renderer.getHeaderPattern(approvalStatus);
    const metricsContent = renderer.renderMetrics(data);

    // Get rejection reason if status is REJECTED
    const rejectionReason = approvalStatus === 'REJECTED'
      ? (approval?.history?.find(h => h.action === 'rejected')?.reason || '未提供驳回原因')
      : null;

    return (
      <div ref={containerRef} className="relative">
        {/* Story 4.4: Subscription indicator badge - top right */}
        {isWatched && (
          <div
            className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm z-10"
            title="已关注"
          >
            <Eye className="w-2.5 h-2.5 text-white" />
          </div>
        )}
        <RichNodeLayout
          headerColor={headerColor}
          headerPattern={headerPattern}
          isSelected={isSelected}
          nodeType={nodeType}
          onDoubleClick={startEditing}
          hangingPill={rejectionReason ? <HangingPill reason={rejectionReason} /> : undefined}
        >
          <TitleRow
            icon={renderer.getIcon()}
            title={label}
            isEditing={isEditing}
            isDone={isTaskDone}
            onTitleChange={setLabel}
            inputRef={titleInputRef as React.RefObject<HTMLInputElement>}
            onKeyDown={handleKeyDown}
          />

          {metricsContent && <MetricsRow>{metricsContent}</MetricsRow>}

          {/* Tags Row - Moved from Footer for better spacing */}
          {tags && tags.length > 0 && (
            <div className="flex items-center gap-1 overflow-hidden w-full min-h-[16px]">
              {tags.slice(0, 3).map((tag: string) => (
                <button
                  key={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    const el = containerRef.current;
                    if (el) {
                      el.dispatchEvent(
                        new CustomEvent('mindmap:tag-search', {
                          bubbles: true,
                          detail: { tag },
                        })
                      );
                    }
                  }}
                  className="px-1.5 py-0.5 rounded-sm text-[9px] font-medium bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer truncate max-w-[80px] flex-shrink-0"
                  title={`搜索标签: #${tag}`}
                >
                  #{tag}
                </button>
              ))}
              {tags.length > 3 && (
                <span className="text-[9px] text-gray-400 flex-shrink-0">+{tags.length - 3}</span>
              )}
            </div>
          )}

          <Footer
            leftContent={
              <>
                {/* Approval Badge */}
                {approvalDecoration && (
                  <div className={`px-1.5 py-0.5 text-[9px] font-medium leading-none rounded ${approvalDecoration.badgeClass}`}>
                    {approvalDecoration.badgeText}
                  </div>
                )}

                {/* Version/Status Pill */}
                {pill && (
                  <div
                    className={`px-1.5 py-0.5 rounded text-[9px] font-medium leading-none truncate ${pill.bg} ${pill.text}`}
                    title={pill.label}
                  >
                    {pill.label}
                  </div>
                )}
              </>
            }
            rightContent={
              <>
                {/* Assignee for Task nodes */}
                {nodeType === NodeType.TASK && (
                  <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                    👤 {(data.props as any)?.assigneeId?.slice(0, 6) || '未分配'}
                  </span>
                )}

                {/* Story 2.9: APP Execute Button */}
                {nodeType === NodeType.APP && (
                  <button
                    onClick={handleAppExecute}
                    disabled={appRunning}
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${appRunning
                      ? 'bg-yellow-100 text-yellow-700 cursor-wait'
                      : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
                      }`}
                    title={appRunning ? '执行中...' : '启动应用'}
                  >
                    {appRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                    <span>启动</span>
                  </button>
                )}

                {/* Story 4.3: Comments Button */}
                <button
                  onClick={handleOpenComments}
                  className="relative inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium 
	                    text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                  title="查看评论"
                >
                  <MessageSquare className="w-3 h-3" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>

                <span className="text-[10px] text-gray-400 font-mono">{node.id.slice(0, 6)}</span>
              </>
            }
          />
        </RichNodeLayout>

        {/* Hidden Measures for auto-resize */}
        <div
          ref={titleMeasureRef}
          className="absolute opacity-0 pointer-events-none text-sm font-bold w-[200px]"
        >
          {label}
        </div>
      </div>
    );
  }

  // 3. LEGACY CARD NODE RENDERING (Requirement, Data, App) - OLD UI
  return (
    <div
      ref={containerRef}
      className={`${containerClasses} relative`}
      onDoubleClick={startEditing}
      title={label} // Native tooltip for full text
    >
      {/* Story 4.4: Subscription indicator badge - top right */}
      {isWatched && (
        <div
          className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm z-10"
          title="已关注"
        >
          <Eye className="w-2.5 h-2.5 text-white" />
        </div>
      )}
      {/* === HEADER (Icon + Title) === */}
      <div className="flex items-center gap-2 w-full">
        <div className="flex-shrink-0">
          {styles.icon && <div className="scale-75 origin-center">{styles.icon}</div>}
        </div>

        {isEditing ? (
          <input
            ref={titleInputRef}
            value={label}
            onChange={e => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-xs font-bold text-gray-900 outline-none min-w-0"
            placeholder="Title"
          />
        ) : (
          <div className={`flex-1 text-xs font-bold truncate ${isTaskDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {label || 'New Item'}
          </div>
        )}

        {/* Menu Trigger */}
        <button className="flex-shrink-0 text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-3 h-3" />
        </button>
      </div>

      {/* === BODY (Desc) === */}
      {/* Only show description if editing or if it exists (very compact) */}
      {(isEditing || description) && (
        <div className="w-full mt-1 min-h-0">
          {isEditing ? (
            <input
              ref={descInputRef}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commit}
              className="w-full bg-transparent text-[10px] text-gray-500 outline-none placeholder-gray-300"
              placeholder="Description..."
            />
          ) : (
            <div className="text-[10px] text-gray-500 truncate leading-tight">
              {description}
            </div>
          )}
        </div>
      )}

      {/* === FOOTER (Pill + Tags + Assignment + ID) === */}
      <div className="w-full flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-100">
        {/* Left: Status Pill + Tags */}
        <div className="flex items-center gap-1 overflow-hidden min-w-0">

          {/* Story 4.1: Approval Status Badge - Priority Display (Leftmost) */}
          {approvalDecoration && nodeType === NodeType.TASK && (
            <div
              className={`flex items-center gap-0.5 px-1 py-0.5 border border-transparent rounded text-[8px] font-medium leading-none flex-shrink-0 ${approvalDecoration.badgeClass}`}
              title={`审批状态: ${approvalDecoration.badgeText}`}
            >
              <span className="truncate">{approvalDecoration.badgeText}</span>
            </div>
          )}

          {pill ? (
            <div className={`px-1.5 py-0.5 rounded text-[9px] font-medium leading-none truncate ${pill.bg} ${pill.text}`} title={pill.label}>
              {pill.label}
            </div>
          ) : <div />}

          {/* Story 2.5: Tag badges (max 2, then +N) */}
          {/* Story 2.6 Fix: Use tags state variable to ensure re-render on tag changes */}
          {tags && tags.length > 0 && (
            <div className="flex items-center gap-0.5 overflow-hidden">
              {tags.slice(0, 2).map((tag: string) => (
                <button
                  key={tag}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Dispatch custom event for tag search
                    const el = containerRef.current;
                    if (el) {
                      el.dispatchEvent(new CustomEvent('mindmap:tag-search', {
                        bubbles: true,
                        detail: { tag }
                      }));
                    }
                  }}
                  className="px-1 py-0.5 rounded text-[8px] font-medium
                             bg-blue-50 text-blue-600 hover:bg-blue-100
                             transition-colors cursor-pointer truncate max-w-[50px] flex-shrink-0"
                  title={`搜索标签: #${tag}`}
                >
                  #{tag}
                </button>
              ))}
              {tags.length > 2 && (
                <span className="text-[8px] text-gray-400 flex-shrink-0">
                  +{tags.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Story 2.4: Assignment Status Badge */}
          {showAssignmentIndicator && (
            <div
              className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-medium leading-none flex-shrink-0 ${assignmentStatus === 'accepted'
                ? 'bg-green-100 text-green-700'
                : assignmentStatus === 'dispatched'
                  ? 'bg-yellow-100 text-yellow-700'
                  : assignmentStatus === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : ''
                }`}
              title={
                assignmentStatus === 'accepted'
                  ? '已接受'
                  : assignmentStatus === 'dispatched'
                    ? '待确认'
                    : assignmentStatus === 'rejected'
                      ? '已驳回'
                      : ''
              }
            >
              {assignmentStatus === 'accepted' && <CheckCircle className="w-2 h-2" />}
              {assignmentStatus === 'dispatched' && <Clock className="w-2 h-2" />}
              {assignmentStatus === 'rejected' && <AlertCircle className="w-2 h-2" />}
              <span className="hidden sm:inline">
                {assignmentStatus === 'accepted' && '已接受'}
                {assignmentStatus === 'dispatched' && '待确认'}
                {assignmentStatus === 'rejected' && '驳回'}
              </span>
            </div>
          )}

        </div>

        {/* Right: Meta ID + APP Execute Button */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Story 2.9: APP node execute button (AC1.2) */}
          {nodeType === NodeType.APP && (
            <button
              onClick={handleAppExecute}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors text-[9px] ${appRunning
                ? 'text-yellow-700 bg-yellow-100 cursor-wait'
                : 'text-cyan-700 bg-cyan-50 hover:bg-cyan-100'
                }`}
              title={appRunning ? '执行中...' : '启动应用'}
              aria-label="启动应用"
              disabled={appRunning}
            >
              {appRunning ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              <span>启动</span>
            </button>
          )}

          {/* Story 4.3: Comments Button for Legacy Nodes */}
          <button
            onClick={handleOpenComments}
            className="relative inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] 
	              text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
            title="查看评论"
          >
            <MessageSquare className="w-3 h-3" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          <span className="text-[9px] font-mono text-gray-400">{node.id.slice(0, 6).toUpperCase()}</span>
          {nodeType === NodeType.DATA && <Lock className="w-2.5 h-2.5 text-gray-300" />}
        </div>
      </div>

      {/* Hidden Measures for auto-resize calculation if needed */}
      <div ref={titleMeasureRef} className="absolute opacity-0 pointer-events-none text-xs font-bold w-[200px]">{label}</div>
      <div ref={descMeasureRef} className="absolute opacity-0 pointer-events-none text-[10px] w-[200px]">{description}</div>
    </div>
  );
}
