'use client';

/**
 * Story 9.5: Upload Button Component
 * Task 2.1: Renders upload button with file input
 * GR-3: File size ≤ 150 LOC
 * GR-4: UI components from @cdm/ui
 *
 * Features:
 * - Click to select file
 * - Drag-and-drop support
 * - Loading state during upload
 */

import { useRef, useState, useCallback, type DragEvent } from 'react';
import { Button, cn } from '@cdm/ui';
import { Upload, Loader2 } from 'lucide-react';
import { useDataUpload } from '@/features/data-library/hooks/useDataUpload';

export interface UploadButtonProps {
  graphId: string;
  folderId?: string;
  onUploadComplete?: () => void;
  className?: string;
  /** Allow multiple file selection (default: false) */
  multiple?: boolean;
}

/**
 * Upload button with file selection and drag-drop support
 * AC#1: Click to upload, create DataAsset
 */
export function UploadButton({
  graphId,
  folderId,
  onUploadComplete,
  className,
  multiple = false,
}: UploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const { upload, isUploading, error } = useDataUpload({
    graphId,
    folderId,
    onSuccess: () => {
      onUploadComplete?.();
    },
  });

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      // Upload files sequentially
      for (const file of Array.from(files)) {
        await upload(file);
      }

      // Reset input to allow re-selecting same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [upload]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      // Upload files sequentially
      for (const file of Array.from(files)) {
        await upload(file);
      }
    },
    [upload]
  );

  return (
    <>
      <Button
        data-testid="upload-button"
        variant="default"
        size="sm"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={isUploading}
        className={cn(
          'gap-1.5',
          isDragOver && 'ring-2 ring-primary ring-offset-2',
          className
        )}
        title={error || '上传文件'}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        <span>{isUploading ? '上传中...' : '上传'}</span>
      </Button>

      <input
        ref={fileInputRef}
        data-testid="file-input"
        type="file"
        className="hidden"
        onChange={handleFileChange}
        multiple={multiple}
        accept="*/*"
      />
    </>
  );
}

export default UploadButton;
