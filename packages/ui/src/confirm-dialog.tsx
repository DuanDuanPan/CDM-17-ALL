'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from './utils';

export interface ConfirmDialogOptions {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
}

interface ConfirmDialogContextType {
    showConfirm: (options: ConfirmDialogOptions) => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
    const [dialogOptions, setDialogOptions] = useState<ConfirmDialogOptions | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const showConfirm = useCallback((options: ConfirmDialogOptions) => {
        setDialogOptions(options);
    }, []);

    const handleConfirm = async () => {
        if (!dialogOptions) return;

        setIsLoading(true);
        try {
            await dialogOptions.onConfirm();
            setDialogOptions(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        if (dialogOptions?.onCancel) {
            dialogOptions.onCancel();
        }
        setDialogOptions(null);
    };

    const variantStyles = {
        danger: {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            iconColor: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-200',
            buttonColor: 'bg-red-600 hover:bg-red-700',
        },
        warning: {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
            iconColor: 'text-amber-600',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-200',
            buttonColor: 'bg-amber-600 hover:bg-amber-700',
        },
        info: {
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            iconColor: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            buttonColor: 'bg-blue-600 hover:bg-blue-700',
        },
    };

    const variant = dialogOptions?.variant || 'warning';
    const styles = variantStyles[variant];

    return (
        <ConfirmDialogContext.Provider value={{ showConfirm }}>
            {children}

            {dialogOptions && createPortal(
                <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 11000 }}>
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={handleCancel}
                    />

                    {/* Dialog */}
                    <div className="relative bg-white/95 backdrop-blur-md rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 border border-gray-200/50 animate-in zoom-in-95 duration-200">
                        <div className="flex gap-4">
                            <div className={cn("flex-shrink-0 p-2 rounded-lg", styles.bgColor, styles.borderColor, "border")}>
                                <div className={styles.iconColor}>
                                    {styles.icon}
                                </div>
                            </div>

                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    {dialogOptions.title}
                                </h3>
                                {dialogOptions.description && (
                                    <p className="text-sm text-gray-600">
                                        {dialogOptions.description}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleCancel}
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                {dialogOptions.cancelText || '取消'}
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isLoading}
                                className={cn(
                                    "flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors",
                                    styles.buttonColor
                                )}
                            >
                                {isLoading ? '处理中...' : (dialogOptions.confirmText || '确认')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </ConfirmDialogContext.Provider>
    );
}

export function useConfirmDialog() {
    const context = useContext(ConfirmDialogContext);
    if (!context) {
        throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
    }
    return context;
}
