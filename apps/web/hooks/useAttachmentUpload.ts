/**
 * Story 4.3+: Comment Attachments
 * useAttachmentUpload Hook - File upload with progress tracking
 */

'use client';

import { useState, useCallback } from 'react';
import type { CommentAttachment } from '@cdm/types';

export interface UploadingFile {
    id: string;  // Temporary ID before upload completes
    file: File;
    progress: number;  // 0-100
    status: 'pending' | 'uploading' | 'done' | 'error';
    error?: string;
    attachment?: CommentAttachment;  // Populated when done
}

export interface UseAttachmentUploadOptions {
    maxFiles?: number;  // Default: 5
    maxSize?: number;   // Default: 10MB
    userId: string;
}

export interface UseAttachmentUploadReturn {
    files: UploadingFile[];
    upload: (file: File) => Promise<void>;
    remove: (id: string) => void;
    clear: () => void;
    getAttachmentIds: () => string[];
    isUploading: boolean;
}

export function useAttachmentUpload({
    maxFiles = 5,
    maxSize = 10 * 1024 * 1024,
    userId,
}: UseAttachmentUploadOptions): UseAttachmentUploadReturn {
    const [files, setFiles] = useState<UploadingFile[]>([]);

    // Generate temporary ID
    const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Upload a single file
    const upload = useCallback(async (file: File) => {
        // Validate file count
        if (files.length >= maxFiles) {
            throw new Error(`最多只能上传 ${maxFiles} 个文件`);
        }

        // Validate file size
        if (file.size > maxSize) {
            throw new Error(`文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`);
        }

        const id = generateId();
        const uploadingFile: UploadingFile = {
            id,
            file,
            progress: 0,
            status: 'pending',
        };

        setFiles(prev => [...prev, uploadingFile]);

        try {
            // Start upload
            setFiles(prev =>
                prev.map(f => f.id === id ? { ...f, status: 'uploading' } : f)
            );

            const formData = new FormData();
            formData.append('file', file);

            // Use XMLHttpRequest for progress tracking
            const result = await new Promise<CommentAttachment>((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const progress = Math.round((e.loaded / e.total) * 100);
                        setFiles(prev =>
                            prev.map(f => f.id === id ? { ...f, progress } : f)
                        );
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(new Error(xhr.responseText || '上传失败'));
                    }
                };

                xhr.onerror = () => reject(new Error('网络错误'));

                xhr.open('POST', '/api/comments/attachments/upload');
                xhr.setRequestHeader('x-user-id', userId);
                xhr.send(formData);
            });

            // Update with success
            setFiles(prev =>
                prev.map(f => f.id === id ? {
                    ...f,
                    status: 'done',
                    progress: 100,
                    attachment: result,
                } : f)
            );
        } catch (err) {
            // Update with error
            const message = err instanceof Error ? err.message : '上传失败';
            setFiles(prev =>
                prev.map(f => f.id === id ? {
                    ...f,
                    status: 'error',
                    error: message,
                } : f)
            );
        }
    }, [files.length, maxFiles, maxSize, userId]);

    // Remove a file from the list
    const remove = useCallback((id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    }, []);

    // Clear all files
    const clear = useCallback(() => {
        setFiles([]);
    }, []);

    // Get attachment IDs for completed uploads
    const getAttachmentIds = useCallback(() => {
        return files
            .filter(f => f.status === 'done' && f.attachment)
            .map(f => f.attachment!.id);
    }, [files]);

    // Check if any files are still uploading
    const isUploading = files.some(f => f.status === 'uploading' || f.status === 'pending');

    return {
        files,
        upload,
        remove,
        clear,
        getAttachmentIds,
        isUploading,
    };
}
