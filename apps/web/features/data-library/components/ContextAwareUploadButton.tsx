'use client';

/**
 * Story 9.7: Context-Aware Upload Button
 * Task 3.1: Combines UploadButton + UploadTypeDropdown + node linking
 *
 * AC2-5: Upload behavior changes based on current view context
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button, useConfirmDialog } from '@cdm/ui';
import { toast } from 'sonner';
import { UploadTypeDropdown } from './UploadTypeDropdown';
import { QuickTypePicker } from './QuickTypePicker';
import { useDataUpload } from '../hooks/useDataUpload';
import { useAssetLinks } from '../hooks/useAssetLinks';
import type { ContextAwareUploadConfig } from '../hooks/useContextAwareUpload';
import type { DataLinkType } from '@cdm/types';

// ========================================
// Types
// ========================================

export interface ContextAwareUploadButtonProps {
    /** Graph ID for upload */
    graphId: string;
    /** Upload configuration from useContextAwareUpload */
    uploadConfig: ContextAwareUploadConfig;
    /** Callback when upload (and optional linking) completes */
    onUploadComplete?: () => void;
}

// ========================================
// Component
// ========================================

/**
 * ContextAwareUploadButton - Smart upload with context-aware linking
 */
export function ContextAwareUploadButton({
    graphId,
    uploadConfig,
    onUploadComplete,
}: ContextAwareUploadButtonProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Upload state
    const [selectedLinkType, setSelectedLinkType] = useState<DataLinkType>(
        uploadConfig.defaultLinkType ?? 'reference'
    );
    const [batchApplyToAll, setBatchApplyToAll] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    // Quick picker state
    const [pickerQueue, setPickerQueue] = useState<File[]>([]);
    const [currentPickerIndex, setCurrentPickerIndex] = useState(0);

    const { showConfirm } = useConfirmDialog();

    // Upload hook
    const { upload, isUploading } = useDataUpload({
        graphId,
        folderId: uploadConfig.mode === 'folder' ? uploadConfig.folderId : undefined,
    });

    // Link hook (only used for node-link mode)
    const { linkAsset } = useAssetLinks({
        nodeId: uploadConfig.nodeId ?? '',
        enabled: false, // Don't fetch, just use for linking
    });

    // Keep local selection aligned with context defaults when context changes:
    // - switching tabs (PBS ↔ Task)
    // - selecting/deselecting a node (unlinked ↔ node-link)
    // AC3/AC4: selection resets to default per view.
    useEffect(() => {
        if (uploadConfig.defaultLinkType) {
            setSelectedLinkType(uploadConfig.defaultLinkType);
        } else {
            setSelectedLinkType('reference');
        }
        setBatchApplyToAll(true);
    }, [uploadConfig.defaultLinkType]);

    // Reset link type when config changes (tab switch)
    const handleLinkTypeChange = useCallback((type: DataLinkType) => {
        setSelectedLinkType(type);
    }, []);

    // Handle file selection
    const processUpload = useCallback(async (files: File[], linkType: DataLinkType | undefined) => {
        setIsProcessing(true);
        let successCount = 0;

        try {
            for (const file of files) {
                const asset = await upload(file);
                if (asset) {
                    // Link if in node-link mode and linkType provided
                    if (uploadConfig.mode === 'node-link' && linkType && uploadConfig.nodeId) {
                        await linkAsset(asset.id, linkType);
                    }
                    successCount++;
                }
            }

            if (successCount > 0) {
                const linkTypeLabel = linkType
                    ? linkType === 'input' ? '输入' : linkType === 'output' ? '输出' : '参考'
                    : '';
                const message = uploadConfig.mode === 'node-link' && linkType
                    ? `已上传 ${successCount} 个文件并关联为${linkTypeLabel}`
                    : `已上传 ${successCount} 个文件`;
                toast.success(message);
                onUploadComplete?.();
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '上传失败');
        } finally {
            setIsProcessing(false);
        }
    }, [upload, uploadConfig.mode, uploadConfig.nodeId, linkAsset, onUploadComplete]);

    // Handle file selection
    const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;

        // Reset input for re-selection
        e.target.value = '';

        // AC5: Handle unlinked mode - show confirmation dialog
        if (uploadConfig.mode === 'unlinked') {
            showConfirm({
                title: '未选中节点',
                description: '请先选择一个节点进行关联，或上传到未关联区域',
                confirmText: '上传到未关联',
                cancelText: '取消',
                variant: 'warning',
                onConfirm: async () => {
                    await processUpload(files, undefined);
                },
            });
            return;
        }

        // AC2: Folder mode - direct upload
        if (uploadConfig.mode === 'folder') {
            await processUpload(files, undefined);
            return;
        }

        // AC3/AC4: Node-link mode
        if (uploadConfig.mode === 'node-link') {
            if (files.length === 1 || batchApplyToAll) {
                // Single file or batch apply - use selected type
                await processUpload(files, selectedLinkType);
            } else {
                // Multiple files without batch apply - use quick picker
                setPickerQueue(files);
                setCurrentPickerIndex(0);
            }
            return;
        }

        // Exhaustive check - if we reach here, mode is unexpected
        const _exhaustiveCheck: never = uploadConfig.mode;
        console.error(`Unexpected upload mode: ${_exhaustiveCheck}`);
    }, [batchApplyToAll, processUpload, selectedLinkType, showConfirm, uploadConfig.mode]);

    // Handle quick picker selection
    const handleQuickPickerSelect = useCallback(async (type: DataLinkType) => {
        const file = pickerQueue[currentPickerIndex];

        // Upload and link this file
        setIsProcessing(true);
        try {
            const asset = await upload(file);
            if (asset && uploadConfig.nodeId) {
                await linkAsset(asset.id, type);
            }
        } catch {
            toast.error(`上传失败: ${file.name}`);
        } finally {
            setIsProcessing(false);
        }

        // Move to next file or close
        if (currentPickerIndex < pickerQueue.length - 1) {
            setCurrentPickerIndex(prev => prev + 1);
        } else {
            // All done
            setPickerQueue([]);
            setCurrentPickerIndex(0);
            toast.success(`已上传 ${pickerQueue.length} 个文件`);
            onUploadComplete?.();
        }
    }, [pickerQueue, currentPickerIndex, upload, uploadConfig.nodeId, linkAsset, onUploadComplete]);

    // Cancel quick picker
    const handleQuickPickerCancel = useCallback(() => {
        setPickerQueue([]);
        setCurrentPickerIndex(0);
        if (currentPickerIndex > 0) {
            toast.info(`已上传 ${currentPickerIndex} 个文件`);
            onUploadComplete?.();
        }
    }, [currentPickerIndex, onUploadComplete]);

    const isLoading = isUploading || isProcessing;
    const showTypeDropdown = uploadConfig.mode === 'node-link';

    return (
        <>
            <div className="flex items-center gap-2">
                <Button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                    data-testid="context-aware-upload-button"
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Upload className="w-4 h-4" />
                    )}
                    <span>上传</span>
                </Button>

                {showTypeDropdown && (
                    <UploadTypeDropdown
                        defaultValue={uploadConfig.defaultLinkType ?? 'reference'}
                        onChange={handleLinkTypeChange}
                        showBatchCheckbox={true}
                        batchApplyToAll={batchApplyToAll}
                        onBatchChange={setBatchApplyToAll}
                    />
                )}

                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    multiple
                    className="hidden"
                    data-testid="upload-file-input"
                />
            </div>

            {/* Quick Type Picker for per-file selection */}
            {pickerQueue.length > 0 && (
                <QuickTypePicker
                    fileName={pickerQueue[currentPickerIndex]?.name ?? ''}
                    currentIndex={currentPickerIndex + 1}
                    totalCount={pickerQueue.length}
                    onSelect={handleQuickPickerSelect}
                    onCancel={handleQuickPickerCancel}
                />
            )}
        </>
    );
}

export default ContextAwareUploadButton;
