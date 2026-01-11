'use client';

/**
 * Keyboard Shortcuts Guide Component
 * Displays all available keyboard shortcuts in a modal dialog
 * Triggered from the top bar via ? icon or keyboard shortcut
 */

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Keyboard,
  MousePointer2,
  Clipboard,
  Eye,
  ChevronDown,
  Navigation,
  Image,
  Command,
} from 'lucide-react';
import { keyboardShortcuts, getPlatformKeys, type ShortcutCategory } from '@/config/keyboard-shortcuts';

interface KeyboardShortcutsGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Get the appropriate icon component for a category
 */
function getCategoryIcon(iconName: string) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Keyboard,
    MousePointer2,
    Clipboard,
    Eye,
    ChevronDown,
    Navigation,
    Image,
    Command,
  };
  return iconMap[iconName] || Keyboard;
}

/**
 * Key Badge Component - displays a single key in a styled badge
 */
function KeyBadge({ keyName }: { keyName: string }) {
  // Map special keys to display symbols
  const displayKey = keyName
    .replace('⌘', '⌘')
    .replace('⇧', '⇧')
    .replace('⌥', '⌥')
    .replace('Ctrl', 'Ctrl')
    .replace('Alt', 'Alt')
    .replace('Shift', '⇧')
    .replace('Enter', '↵')
    .replace('Escape', 'Esc')
    .replace('Delete', 'Del')
    .replace('Backspace', '⌫')
    .replace('Tab', '⇥')
    .replace('Space', '␣');

  return (
    <kbd
      className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5
                 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                 rounded text-xs font-mono font-medium text-gray-700 dark:text-gray-200
                 shadow-sm"
    >
      {displayKey}
    </kbd>
  );
}

/**
 * Shortcut Row Component - displays a single shortcut with keys and description
 */
function ShortcutRow({
  keys,
  description,
}: {
  keys: string[];
  description: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <span className="text-sm text-gray-700 dark:text-gray-300">{description}</span>
      <div className="flex items-center gap-1 ml-4">
        {keys.map((key, index) => (
          <span key={index} className="flex items-center">
            <KeyBadge keyName={key} />
            {index < keys.length - 1 && (
              <span className="text-gray-400 mx-0.5 text-xs">+</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Category Section Component - displays a category with its shortcuts
 */
function CategorySection({
  category,
  isMac,
}: {
  category: ShortcutCategory;
  isMac: boolean;
}) {
  const Icon = getCategoryIcon(category.icon);

  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-2 px-3">
        <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {category.title}
        </h3>
      </div>
      <div className="space-y-0.5">
        {category.shortcuts.map((shortcut, index) => (
          <ShortcutRow
            key={index}
            keys={getPlatformKeys(shortcut, isMac)}
            description={shortcut.description}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Keyboard Shortcuts Guide Modal
 */
export function KeyboardShortcutsGuide({
  open,
  onOpenChange,
}: KeyboardShortcutsGuideProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Detect platform
  const isMac = useMemo(() => {
    if (typeof navigator !== 'undefined') {
      return navigator.platform.toLowerCase().includes('mac');
    }
    return false;
  }, []);

  // Close on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onOpenChange]);

  // ? shortcut to open
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      // Only trigger on ? (Shift+/)
      if (e.key === '?' && !open) {
        // Don't trigger in input fields
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [open, onOpenChange]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[11000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="快捷键指南"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog Content */}
      <div
        data-testid="keyboard-shortcuts-guide"
        className="relative w-full max-w-[720px] max-h-[calc(100vh-2rem)] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl
                   rounded-xl border border-gray-200/50 dark:border-gray-700/50
                   shadow-2xl shadow-black/20 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <Keyboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                快捷键指南
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isMac ? 'macOS' : 'Windows / Linux'} 快捷键
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            {/* Left Column */}
            <div>
              {keyboardShortcuts
                .slice(0, Math.ceil(keyboardShortcuts.length / 2))
                .map((category, index) => (
                  <CategorySection key={index} category={category} isMac={isMac} />
                ))}
            </div>
            {/* Right Column */}
            <div>
              {keyboardShortcuts
                .slice(Math.ceil(keyboardShortcuts.length / 2))
                .map((category, index) => (
                  <CategorySection key={index} category={category} isMac={isMac} />
                ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            按 <KeyBadge keyName="?" /> 随时打开此指南 · 按 <KeyBadge keyName="Esc" /> 关闭
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default KeyboardShortcutsGuide;
