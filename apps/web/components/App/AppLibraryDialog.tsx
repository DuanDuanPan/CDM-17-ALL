'use client';

/**
 * Story 2.9: APP Library Selection Dialog
 * Allows users to search and select from satellite application library
 */

import { useState, useEffect, useCallback } from 'react';
import { Search, Grid3X3, X, Check, Loader2 } from 'lucide-react';
import type { AppLibraryEntry } from '@cdm/types';

export interface AppLibraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (entry: AppLibraryEntry) => void;
}

export function AppLibraryDialog({ open, onOpenChange, onSelect }: AppLibraryDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<AppLibraryEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<AppLibraryEntry | null>(null);

  // Fetch entries from API
  const fetchEntries = useCallback(async (query?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) {
        params.set('q', query);
      }
      const response = await fetch(`/api/app-library?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data);
      }
    } catch (error) {
      console.error('Failed to fetch app library:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/app-library/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      fetchEntries();
      fetchCategories();
      setSearchQuery('');
      setSelectedCategory(null);
      setSelectedEntry(null);
    }
  }, [open, fetchEntries, fetchCategories]);

  // Search with debounce
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      fetchEntries(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, open, fetchEntries]);

  // Filter by category
  const filteredEntries = selectedCategory
    ? entries.filter((e) => e.category === selectedCategory)
    : entries;

  const handleSelect = useCallback(() => {
    if (selectedEntry) {
      onSelect(selectedEntry);
    }
  }, [selectedEntry, onSelect]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[700px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-cyan-500" />
            <h2 className="text-lg font-semibold text-gray-900">卫星应用库</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索应用名称、分类或描述..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${selectedCategory === null
                    ? 'bg-cyan-100 text-cyan-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                全部
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-colors ${selectedCategory === category
                      ? 'bg-cyan-100 text-cyan-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Entry List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">加载中...</span>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Grid3X3 className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm">未找到匹配的应用</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredEntries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`p-4 text-left rounded-lg border-2 transition-all ${selectedEntry?.id === entry.id
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-gray-200 hover:border-cyan-300 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${selectedEntry?.id === entry.id ? 'bg-cyan-100' : 'bg-gray-100'
                      }`}>
                      <Grid3X3 className={`w-5 h-5 ${selectedEntry?.id === entry.id ? 'text-cyan-600' : 'text-gray-500'
                        }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {entry.name}
                        </h3>
                        {entry.version && (
                          <span className="text-xs text-gray-400 font-mono">
                            {entry.version}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {entry.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">
                          {entry.category}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {entry.defaultInputs.length} 输入 / {entry.defaultOutputs.length} 输出
                        </span>
                      </div>
                    </div>
                    {selectedEntry?.id === entry.id && (
                      <Check className="w-5 h-5 text-cyan-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500">
            {filteredEntries.length} 个应用
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedEntry}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${selectedEntry
                  ? 'bg-cyan-500 text-white hover:bg-cyan-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
              选择应用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
