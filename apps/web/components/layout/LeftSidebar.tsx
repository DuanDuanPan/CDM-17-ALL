'use client';

/**
 * LeftSidebar - Unified sidebar with templates, outline, properties, comments, and archive
 * 
 * Story: Unified Left Sidebar - Consolidates all panels into a single sidebar.
 * 
 * Features:
 * - Mutually exclusive panels (only one can be open at a time)
 * - Properties and Comments panels auto-collapse when no node is selected
 * - Toggling: clicking active icon closes panel, clicking different icon switches panel
 */

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Loader2,
  RefreshCw,
  Search,
  Globe,
  User,
  Clock,
  ListTree,
  Settings2,
  MessageSquare,
  Archive,
} from 'lucide-react';
import type { Graph } from '@antv/x6';
import type * as Y from 'yjs';
import { useTemplates } from '@/hooks/useTemplates';
import { useUnifiedSidebar, type SidebarPanel } from '@/hooks/useUnifiedSidebar';
import { TemplateCardMini } from '@/components/TemplateLibrary/TemplateCardMini';
import { OutlinePanel } from '@/components/graph/parts/OutlinePanel';
import { PropertiesPanelContent } from './panels/PropertiesPanelContent';
import { CommentsPanelContent } from './panels/CommentsPanelContent';
import { ArchivePanelContent } from './panels/ArchivePanelContent';
import type { TemplateListItem } from '@cdm/types';
import type { OutlineNode } from '@/components/graph/hooks/useOutlineData';

/** Template filter tab type */
type TemplateTab = 'all' | 'mine' | 'recent';

interface NavItem {
  id: SidebarPanel;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { id: 'templates', icon: <LayoutGrid className="w-5 h-5" />, label: '模板' },
  { id: 'outline', icon: <ListTree className="w-5 h-5" />, label: '大纲' },
  { id: 'properties', icon: <Settings2 className="w-5 h-5" />, label: '属性' },
  { id: 'comments', icon: <MessageSquare className="w-5 h-5" />, label: '讨论' },
  { id: 'archive', icon: <Archive className="w-5 h-5" />, label: '归档' },
];

export interface LeftSidebarProps {
  /** Whether dependency mode is active */
  isDependencyMode?: boolean;
  /** Callback when dependency mode is toggled */
  onDependencyModeToggle?: () => void;
  /** Open template library dialog */
  onTemplatesOpen?: () => void;
  /** Current user ID for template loading and comments */
  userId?: string;

  // Graph-related props for property panel
  /** X6 Graph reference */
  graph?: Graph | null;
  /** Current graph ID */
  graphId?: string;
  /** Yjs document for sync */
  yDoc?: Y.Doc | null;
  /** Creator name for new nodes */
  creatorName?: string;

  // Outline View props
  /** Whether graph is ready for outline operations */
  isOutlineReady?: boolean;
  /** Outline tree data from useOutlineData hook */
  outlineData?: OutlineNode[];
  /** Currently selected node ID */
  selectedNodeId?: string | null;
  /** Selected node label for comments panel */
  selectedNodeLabel?: string;
  /** Callback when outline node is clicked */
  onOutlineNodeClick?: (nodeId: string) => void;
  /** Callback when node is reordered via drag */
  onOutlineReorder?: (nodeId: string, newParentId: string | null, index: number) => void;
  /** Callback when comments are marked as read */
  onMarkCommentsAsRead?: () => void;
  /** Callback when archive node is restored */
  onArchiveRestore?: (nodeId: string) => void;
}

export function LeftSidebar({
  isDependencyMode = false,
  onDependencyModeToggle,
  onTemplatesOpen,
  userId = 'anonymous',
  // Graph props
  graph = null,
  graphId = '',
  yDoc = null,
  creatorName,
  // Outline View props
  isOutlineReady = false,
  outlineData,
  selectedNodeId = null,
  selectedNodeLabel = '',
  onOutlineNodeClick,
  onOutlineReorder,
  onMarkCommentsAsRead,
  onArchiveRestore,
}: LeftSidebarProps = {}) {
  // Unified sidebar state management
  const { activePanel, isExpanded, togglePanel, closePanel, openPanel } = useUnifiedSidebar({
    selectedNodeId,
  });

  // Get current active nav item
  const activeNavItem = navItems.find((item) => item.id === activePanel);

  // Template filter states
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateTab, setTemplateTab] = useState<TemplateTab>('all');

  // Load templates for sidebar display
  const {
    templates,
    isLoading,
    error,
    loadTemplates,
    loadTemplate,
    selectedTemplate,
    isLoadingTemplate,
    deleteTemplate,
    isDeleting,
  } = useTemplates();

  // Listen for node comment button click - auto open comments panel
  useEffect(() => {
    const handleOpenComments = (event: Event) => {
      const customEvent = event as CustomEvent<{ nodeId: string; nodeLabel: string }>;
      // Open comments panel - it will show the currently selected node's comments
      if (customEvent.detail?.nodeId) {
        // Use setTimeout to ensure the node selection has completed
        // Use force=true to bypass the selectedNodeId check (node will be selected by then)
        setTimeout(() => {
          openPanel('comments', true);
        }, 50);
      }
    };
    window.addEventListener('mindmap:open-comments', handleOpenComments);
    return () => {
      window.removeEventListener('mindmap:open-comments', handleOpenComments);
    };
  }, [openPanel]);

  // Load templates when templates nav is active
  useEffect(() => {
    if (activePanel === 'templates' && isExpanded) {
      loadTemplates({
        userId,
        limit: 10,
        search: templateSearch || undefined,
        mine: templateTab === 'mine' || undefined,
      });
    }
  }, [activePanel, isExpanded, userId, loadTemplates, templateSearch, templateTab]);

  // Handle template drag start
  const handleTemplateDragStart = useCallback(
    (_e: React.DragEvent, _template: TemplateListItem) => {
      // Close sidebar panel for better drag experience
      closePanel();
    },
    [closePanel]
  );

  // Handle template card click - load full structure for preview
  const handleTemplateClick = useCallback(
    (template: TemplateListItem) => {
      loadTemplate(template.id, userId);
    },
    [loadTemplate, userId]
  );

  // Handle template delete
  const handleTemplateDelete = useCallback(
    async (templateId: string) => {
      try {
        await deleteTemplate(templateId, userId);
      } catch (err) {
        console.error('[LeftSidebar] Delete template failed:', err);
      }
    },
    [deleteTemplate, userId]
  );

  // Handle nav item click with toggle behavior
  const handleNavClick = useCallback((itemId: SidebarPanel) => {
    togglePanel(itemId);
  }, [togglePanel]);

  // Render panel content based on active panel
  const renderPanelContent = () => {
    switch (activePanel) {
      case 'templates':
        return (
          <div className="space-y-3">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                placeholder="搜索模板..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 text-[10px]">
              <button
                onClick={() => setTemplateTab('all')}
                className={`flex-1 py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors ${templateTab === 'all'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
                  }`}
              >
                <Globe className="w-3 h-3" />
                全部
              </button>
              <button
                onClick={() => setTemplateTab('mine')}
                className={`flex-1 py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors ${templateTab === 'mine'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
                  }`}
              >
                <User className="w-3 h-3" />
                我的
              </button>
              <button
                onClick={() => setTemplateTab('recent')}
                className={`flex-1 py-1 px-2 rounded flex items-center justify-center gap-1 transition-colors ${templateTab === 'recent'
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-500 hover:bg-gray-100'
                  }`}
              >
                <Clock className="w-3 h-3" />
                最近
              </button>
            </div>

            {/* Open library button */}
            <button
              onClick={onTemplatesOpen}
              className="w-full px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              打开完整模板库
            </button>

            {/* Template cards */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-xs text-red-500 mb-2">加载失败</p>
                <button
                  onClick={() => loadTemplates({ userId, limit: 10 })}
                  className="text-xs text-blue-500 hover:underline flex items-center justify-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  重试
                </button>
              </div>
            ) : templates.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                暂无模板
              </p>
            ) : (
              <div className="space-y-2">
                {templates.slice(0, 5).map((template) => (
                  <TemplateCardMini
                    key={template.id}
                    template={template}
                    fullTemplate={
                      selectedTemplate?.id === template.id
                        ? selectedTemplate
                        : undefined
                    }
                    isLoadingStructure={
                      isLoadingTemplate && selectedTemplate?.id === template.id
                    }
                    onDragStart={handleTemplateDragStart}
                    onClick={handleTemplateClick}
                    currentUserId={userId}
                    onDelete={handleTemplateDelete}
                    isDeleting={isDeleting}
                  />
                ))}
                {templates.length > 5 && (
                  <button
                    onClick={onTemplatesOpen}
                    className="w-full text-xs text-blue-500 hover:underline py-2"
                  >
                    查看全部 {templates.length} 个模板
                  </button>
                )}
              </div>
            )}

            <p className="text-[10px] text-gray-400 leading-relaxed">
              提示：拖拽模板到画布，挂载为选中节点的子节点
            </p>
          </div>
        );

      case 'outline':
        return (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 mb-2">
              点击节点跳转，拖拽重排层级
            </p>
            {isOutlineReady && onOutlineNodeClick && onOutlineReorder ? (
              <OutlinePanel
                data={outlineData ?? []}
                selectedNodeId={selectedNodeId ?? null}
                onNodeClick={onOutlineNodeClick}
                onReorder={onOutlineReorder}
              />
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">
                请打开图谱以查看大纲
              </p>
            )}
          </div>
        );

      case 'properties':
        return (
          <PropertiesPanelContent
            selectedNodeId={selectedNodeId}
            graph={graph}
            graphId={graphId}
            yDoc={yDoc}
            creatorName={creatorName}
          />
        );

      case 'comments':
        return (
          <CommentsPanelContent
            nodeId={selectedNodeId}
            nodeLabel={selectedNodeLabel}
            mindmapId={graphId}
            userId={userId}
            onMarkAsRead={onMarkCommentsAsRead}
          />
        );

      case 'archive':
        return (
          <ArchivePanelContent
            graphId={graphId}
            onRestore={onArchiveRestore}
          />
        );

      default:
        return null;
    }
  };

  return (
    <aside className="relative flex h-full bg-white/80 backdrop-blur-md border-r border-gray-200/50">
      {/* Icon strip navigation */}
      <nav className="w-14 flex flex-col items-center py-4 border-r border-gray-100">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
            data-nav-id={item.id}
            className={`w-10 h-10 flex items-center justify-center rounded-lg mb-2 transition-colors ${activePanel === item.id
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-500 hover:bg-gray-100'
              }`}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}

        {/* Dependency mode toggle */}
        <div className="flex-1" />
        <div className="border-t border-gray-100 pt-2 w-full flex flex-col items-center">
          <button
            onClick={onDependencyModeToggle}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${isDependencyMode
              ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-300'
              : 'text-gray-500 hover:bg-gray-100'
              }`}
            title={isDependencyMode ? '退出依赖连线模式 (ESC)' : '依赖连线模式'}
          >
            <GitBranch className="w-5 h-5" />
          </button>
          {isDependencyMode && (
            <span className="text-[10px] text-orange-600 mt-1 text-center leading-tight">
              连线中
            </span>
          )}
        </div>
      </nav>

      {/* Expandable panel - wider for properties/comments/archive */}
      <div
        className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'w-80' : 'w-0'
          }`}
      >
        <div className="w-80 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-800">{activeNavItem?.label ?? '面板'}</h2>
            <button
              onClick={closePanel}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {renderPanelContent()}
          </div>
        </div>
      </div>

      {/* Expand button when collapsed */}
      {!isExpanded && (
        <button
          onClick={() => togglePanel('templates')}
          className="absolute left-14 top-1/2 -translate-y-1/2 w-4 h-8 bg-white border border-gray-200 rounded-r flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="w-3 h-3 text-gray-500" />
        </button>
      )}
    </aside>
  );
}
