'use client';

import { Menu, Share2, Settings } from 'lucide-react';

export interface TopBarProps {
  projectName?: string;
}

export function TopBar({ projectName = '未命名项目' }: TopBarProps) {
  return (
    <header className="h-12 border-b border-gray-200/50 bg-white/70 backdrop-blur-md flex items-center justify-between px-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-sm font-medium text-gray-800">{projectName}</h1>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Share2 className="w-4 h-4 text-gray-600" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <Settings className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </header>
  );
}
