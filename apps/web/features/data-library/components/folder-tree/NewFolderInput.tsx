'use client';

import { useRef } from 'react';
import { FolderPlus } from 'lucide-react';

interface NewFolderInputProps {
  onConfirm: (name: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  level: number;
}

export function NewFolderInput({
  onConfirm,
  onCancel,
  isLoading,
  level,
}: NewFolderInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onConfirm(inputRef.current?.value ?? '');
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  const handleBlur = () => {
    const value = inputRef.current?.value ?? '';
    if (value.trim()) {
      onConfirm(value);
    } else {
      onCancel();
    }
  };

  return (
    <div
      className="flex items-center gap-1 h-8 px-2"
      style={{ paddingLeft: `${level * 16 + 8}px` }}
    >
      <span className="w-4" />
      <FolderPlus className="w-4 h-4 text-yellow-500 flex-shrink-0" />
      <input
        ref={inputRef}
        type="text"
        placeholder="新文件夹名称"
        className="flex-1 text-sm px-1 py-0.5 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white dark:bg-gray-800"
        autoFocus
        disabled={isLoading}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    </div>
  );
}

