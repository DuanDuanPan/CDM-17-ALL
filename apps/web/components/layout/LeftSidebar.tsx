'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutGrid,
  // 暂时隐藏的图标: Shapes, Type, Image, Link2
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
} from 'lucide-react';
import { useTemplates } from '@/hooks/useTemplates';
import { TemplateCardMini } from '@/components/TemplateLibrary/TemplateCardMini';
import { OutlinePanel } from '@/components/graph/parts/OutlinePanel';
import type { TemplateListItem } from '@cdm/types';
import type { OutlineNode } from '@/components/graph/hooks/useOutlineData';

/** Template filter tab type */
type TemplateTab = 'all' | 'mine' | 'recent';

interface NavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  // 暂时隐藏: components, text, media, links
  { id: 'templates', icon: <LayoutGrid className="w-5 h-5" />, label: '模板' },
  { id: 'outline', icon: <ListTree className="w-5 h-5" />, label: '大纲' },
];

// Story 2.2 + Story 5.2 + Story 8.4: Props
export interface LeftSidebarProps {
  /** Whether dependency mode is active */
  isDependencyMode?: boolean;
  /** Callback when dependency mode is toggled */
  onDependencyModeToggle?: () => void;
  /** Story 5.2: Open template library dialog */
  onTemplatesOpen?: () => void;
  /** Story 5.2: Current user ID for template loading */
  userId?: string;
  // Story 8.4: Outline View
  /** Whether graph is ready for outline operations */
  isOutlineReady?: boolean;
  /** Outline tree data from useOutlineData hook */
  outlineData?: OutlineNode[];
  /** Currently selected node ID */
  selectedNodeId?: string | null;
  /** Callback when outline node is clicked */
  onOutlineNodeClick?: (nodeId: string) => void;
  /** Callback when node is reordered via drag */
  onOutlineReorder?: (nodeId: string, newParentId: string | null, index: number) => void;
}

export function LeftSidebar({
  isDependencyMode = false,
  onDependencyModeToggle,
  onTemplatesOpen,
  userId = 'anonymous',
  // Story 8.4: Outline View props
  isOutlineReady = false,
  outlineData,
  selectedNodeId,
  onOutlineNodeClick,
  onOutlineReorder,
}: LeftSidebarProps = {}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeNav, setActiveNav] = useState('templates');
  const activeNavItem = navItems.find((item) => item.id === activeNav);

  // Story 5.2: Template filter states
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateTab, setTemplateTab] = useState<TemplateTab>('all');

  // Story 5.2: Load templates for sidebar display
  // Story 5.3: Added deleteTemplate for template deletion
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

  // Load templates when templates nav is active or filter changes
  useEffect(() => {
    if (activeNav === 'templates' && isExpanded) {
      loadTemplates({
        userId,
        limit: 10,
        search: templateSearch || undefined,
        mine: templateTab === 'mine' || undefined,
      });
    }
  }, [activeNav, isExpanded, userId, loadTemplates, templateSearch, templateTab]);

  // Handle template drag start
  const handleTemplateDragStart = useCallback(
    (_e: React.DragEvent, _template: TemplateListItem) => {
      // Data is already set in TemplateCardMini
      // Close sidebar panel for better drag experience
      setIsExpanded(false);
    },
    []
  );

  // Handle template card click - load full structure for preview
  const handleTemplateClick = useCallback(
    (template: TemplateListItem) => {
      loadTemplate(template.id, userId);
    },
    [loadTemplate, userId]
  );

  // Story 5.3: Handle template delete
  const handleTemplateDelete = useCallback(
    async (templateId: string) => {
      try {
        await deleteTemplate(templateId, userId);
      } catch (err) {
        // Error is already handled in hook and shown to user
        console.error('[LeftSidebar] Delete template failed:', err);
      }
    },
    [deleteTemplate, userId]
  );

  return (
    <aside className="relative flex h-full bg-white/80 backdrop-blur-md border-r border-gray-200/50">
      {/* Icon strip navigation */}
      <nav className="w-14 flex flex-col items-center py-4 border-r border-gray-100">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveNav(item.id);
              if (!isExpanded) setIsExpanded(true);
            }}
            data-nav-id={item.id}
            className={`w-10 h-10 flex items-center justify-center rounded-lg mb-2 transition-colors ${activeNav === item.id
              ? 'bg-blue-50 text-blue-600'
              : 'text-gray-500 hover:bg-gray-100'
              }`}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}

        {/* Story 2.2: Dependency mode toggle */}
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

      {/* Expandable panel */}
      <div
        className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'w-56' : 'w-0'
          }`}
      >
        <div className="w-56 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-800">{activeNavItem?.label ?? '组件库'}</h2>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeNav === 'templates' ? (
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
            ) : activeNav === 'outline' ? (
              // Story 8.4: Outline View
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
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 mb-3">拖拽组件到画布</p>
                <div className="grid grid-cols-2 gap-2">
                  {['主题', '子主题', '备注', '链接'].map((item) => (
                    <div
                      key={item}
                      className="p-3 bg-gray-50 rounded-lg text-center text-sm text-gray-600 cursor-grab hover:bg-gray-100 transition-colors border border-gray-200"
                      draggable
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expand button when collapsed */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute left-14 top-1/2 -translate-y-1/2 w-4 h-8 bg-white border border-gray-200 rounded-r flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          <ChevronRight className="w-3 h-3 text-gray-500" />
        </button>
      )}
    </aside>
  );
}
