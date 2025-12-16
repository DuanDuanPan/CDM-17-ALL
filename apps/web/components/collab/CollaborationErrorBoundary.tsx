'use client';

import React, { Component, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

/**
 * MED-4: Error Boundary for Collaboration Components
 *
 * Catches errors in collaboration-related components and provides:
 * - Fallback UI instead of white screen
 * - Retry mechanism
 * - Automatic degradation messaging
 *
 * Story 1.4: Real-time Collaboration Engine
 */

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class CollaborationErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Log error to console in development (already handled by logger in prod)
        console.error('[CollaborationErrorBoundary] Caught error:', error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center p-6 bg-yellow-50 border border-yellow-200 rounded-lg m-4">
                    <AlertTriangle className="w-8 h-8 text-yellow-500 mb-3" />
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">
                        协作功能暂时不可用
                    </h3>
                    <p className="text-sm text-yellow-600 mb-4 text-center">
                        实时协作遇到问题，您可以继续使用离线模式编辑
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-2 px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        重试连接
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default CollaborationErrorBoundary;
