'use client';

import { X, Palette, Type, Layout, Link2 } from 'lucide-react';

export interface RightSidebarProps {
  selectedNodeId: string | null;
  onClose?: () => void;
}

export function RightSidebar({ selectedNodeId, onClose }: RightSidebarProps) {
  if (!selectedNodeId) {
    return null;
  }

  return (
    <aside className="w-72 h-full bg-white/80 backdrop-blur-md border-l border-gray-200/50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="font-medium text-gray-800">属性面板</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Style section */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Palette className="w-4 h-4" />
            样式
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">背景颜色</label>
              <div className="flex gap-2">
                {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6'].map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">边框样式</label>
              <select className="w-full text-sm border border-gray-200 rounded px-2 py-1.5">
                <option>实线</option>
                <option>虚线</option>
                <option>点线</option>
              </select>
            </div>
          </div>
        </section>

        {/* Text section */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Type className="w-4 h-4" />
            文本
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">标题</label>
              <input
                type="text"
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
                placeholder="输入标题..."
                defaultValue="中心主题"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">字体大小</label>
              <select className="w-full text-sm border border-gray-200 rounded px-2 py-1.5" defaultValue="16px">
                <option>12px</option>
                <option>14px</option>
                <option>16px</option>
                <option>18px</option>
                <option>24px</option>
              </select>
            </div>
          </div>
        </section>

        {/* Layout section */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Layout className="w-4 h-4" />
            布局
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">宽度</label>
              <input
                type="number"
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
                defaultValue={160}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">高度</label>
              <input
                type="number"
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
                defaultValue={50}
              />
            </div>
          </div>
        </section>

        {/* Links section */}
        <section>
          <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Link2 className="w-4 h-4" />
            链接
          </h3>
          <button className="w-full text-sm text-blue-600 border border-blue-200 rounded px-3 py-2 hover:bg-blue-50 transition-colors">
            + 添加链接
          </button>
        </section>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">
          节点 ID: {selectedNodeId}
        </p>
      </div>
    </aside>
  );
}
