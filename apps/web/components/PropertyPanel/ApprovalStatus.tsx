'use client';

/**
 * Story 7.9: ApprovalStatus Component
 *
 * Extracted from ApprovalStatusPanel.tsx (lines 66-83, 516-556)
 * Displays approval status header, badges, and unconfigured state.
 *
 * This is a presentational component - all logic is received via props/callbacks.
 * No API calls are made here - follows Hook-First pattern.
 */

import {
    ShieldCheck,
    Check,
    X,
    Clock,
    Send,
    Plus,
    Settings,
} from 'lucide-react';
import { Button, Badge } from '@cdm/ui';
import type { ApprovalStatus as ApprovalStatusType } from '@cdm/types';

// Badge variant type for status mapping
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';

// Props for ApprovalStatus header (configured state)
export interface ApprovalStatusHeaderProps {
    status: ApprovalStatusType;
    hasSteps: boolean;
}

// Props for unconfigured state
export interface UnconfiguredApprovalProps {
    onConfigure: () => void;
}

// Props for status message at bottom
export interface ApprovalStatusMessageProps {
    status: ApprovalStatusType;
}

/**
 * Get status badge variant, label, and icon
 */
export function getStatusBadge(status: ApprovalStatusType, hasSteps: boolean): { variant: BadgeVariant; label: string; icon: React.ReactNode } {
    switch (status) {
        case 'PENDING':
            return { variant: 'warning', label: '待审批', icon: <Clock className="h-3 w-3" /> };
        case 'APPROVED':
            return { variant: 'success', label: '已通过', icon: <Check className="h-3 w-3" /> };
        case 'REJECTED':
            return { variant: 'destructive', label: '已驳回', icon: <X className="h-3 w-3" /> };
        default:
            if (hasSteps) {
                return { variant: 'info', label: '待提交', icon: <Send className="h-3 w-3" /> };
            }
            return { variant: 'secondary', label: '未配置', icon: <ShieldCheck className="h-3 w-3" /> };
    }
}

/**
 * ApprovalStatusHeader - Header with title and status badge
 */
export function ApprovalStatusHeader({ status, hasSteps }: ApprovalStatusHeaderProps) {
    const statusBadge = getStatusBadge(status, hasSteps);

    return (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2 text-gray-700">
                <ShieldCheck className="h-4 w-4" />
                审批流程
            </h3>
            <Badge variant={statusBadge.variant} className="gap-1">
                {statusBadge.icon}
                {statusBadge.label}
            </Badge>
        </div>
    );
}

/**
 * UnconfiguredApproval - Display when no workflow is configured
 */
export function UnconfiguredApproval({ onConfigure }: UnconfiguredApprovalProps) {
    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2 text-gray-700">
                    <ShieldCheck className="h-4 w-4" />
                    审批流程
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onConfigure}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                    <Plus className="h-3 w-3" />
                    配置流程
                </Button>
            </div>
            <div className="p-4 text-center">
                <Settings className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400 mb-3">
                    此任务未配置审批流程
                </p>
                <Button onClick={onConfigure}>
                    <Plus className="h-4 w-4" />
                    配置审批流程
                </Button>
            </div>
        </div>
    );
}

/**
 * ApprovalStatusMessage - Status message at bottom of panel
 */
export function ApprovalStatusMessage({ status }: ApprovalStatusMessageProps) {
    if (status === 'APPROVED') {
        return (
            <p className="text-sm text-green-600 flex items-center gap-2">
                <Check className="h-4 w-4" />
                审批已通过
            </p>
        );
    }

    if (status === 'REJECTED') {
        return (
            <p className="text-sm text-red-600 flex items-center gap-2">
                <X className="h-4 w-4" />
                审批已驳回
            </p>
        );
    }

    return null;
}
