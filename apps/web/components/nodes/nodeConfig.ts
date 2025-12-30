/**
 * Node configuration helpers.
 * Story 7.4: Extracted from MindNode for single responsibility.
 */

import React from 'react';
import { CheckCircle, FileText, Box, Database, Grid3X3 } from 'lucide-react';
import { NodeType, type ApprovalStatus } from '@cdm/types';

export interface TypeConfig {
    borderColor: string;
    bgColor: string;
    shadowColor: string;
    accentColor: string;
    icon: React.ReactNode | null;
    pill: { bg: string; text: string; label: string } | null;
}

export interface ApprovalDecoration {
    containerClass: string;
    badgeClass: string;
    badgeText: string;
}

/**
 * Get semantic styling configuration for a node type.
 */
export const getTypeConfig = (type: NodeType, isDone: boolean = false): TypeConfig => {
    if (isDone) {
        return {
            borderColor: 'border-emerald-200',
            bgColor: 'bg-emerald-50/80',
            shadowColor: 'shadow-emerald-900/5',
            accentColor: 'text-emerald-600',
            icon: React.createElement(CheckCircle, { className: 'w-5 h-5 text-emerald-500' }),
            pill: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Done' },
        };
    }

    switch (type) {
        case NodeType.TASK:
            return {
                borderColor: 'border-emerald-400',
                bgColor: 'bg-white/90',
                shadowColor: 'shadow-emerald-500/20',
                accentColor: 'text-emerald-600',
                icon: React.createElement(CheckCircle, { className: 'w-5 h-5 text-emerald-500' }),
                pill: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Todo' },
            };
        case NodeType.REQUIREMENT:
            return {
                borderColor: 'border-violet-400',
                bgColor: 'bg-white/90',
                shadowColor: 'shadow-violet-500/20',
                accentColor: 'text-violet-600',
                icon: React.createElement(FileText, { className: 'w-5 h-5 text-violet-500' }),
                pill: { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Must Have' },
            };
        case NodeType.PBS:
            return {
                borderColor: 'border-sky-400',
                bgColor: 'bg-white/90',
                shadowColor: 'shadow-sky-500/20',
                accentColor: 'text-sky-600',
                icon: React.createElement(Box, { className: 'w-5 h-5 text-sky-500' }),
                pill: { bg: 'bg-sky-100', text: 'text-sky-700', label: 'v1.0' },
            };
        case NodeType.DATA:
            return {
                borderColor: 'border-amber-400',
                bgColor: 'bg-white/90',
                shadowColor: 'shadow-amber-500/20',
                accentColor: 'text-amber-600',
                icon: React.createElement(Database, { className: 'w-5 h-5 text-amber-500' }),
                pill: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Internal' },
            };
        case NodeType.APP:
            return {
                borderColor: 'border-cyan-400',
                bgColor: 'bg-white/90',
                shadowColor: 'shadow-cyan-500/20',
                accentColor: 'text-cyan-600',
                icon: React.createElement(Grid3X3, { className: 'w-5 h-5 text-cyan-500' }),
                pill: { bg: 'bg-cyan-100', text: 'text-cyan-700', label: 'App' },
            };
        default: // ORDINARY
            return {
                borderColor: 'border-gray-200',
                bgColor: 'bg-white',
                shadowColor: 'shadow-sm',
                accentColor: 'text-gray-600',
                icon: null,
                pill: null,
            };
    }
};

/**
 * Get approval status decoration styles.
 * Story 4.1: Enhanced visualization for approval workflow.
 */
export const getApprovalDecoration = (approvalStatus: ApprovalStatus | undefined): ApprovalDecoration | null => {
    switch (approvalStatus) {
        case 'PENDING':
            return {
                containerClass: 'border-2 border-dashed border-amber-400 bg-amber-50/30',
                badgeClass: 'bg-amber-100 text-amber-800',
                badgeText: '待审批',
            };
        case 'APPROVED':
            return {
                containerClass: 'border-2 border-solid border-emerald-500 bg-emerald-50/10',
                badgeClass: 'bg-emerald-100 text-emerald-700',
                badgeText: '已通过',
            };
        case 'REJECTED':
            return {
                containerClass: 'border-2 border-solid border-rose-500 bg-rose-50/30 shadow-[0_0_10px_rgba(244,63,94,0.2)]',
                badgeClass: 'bg-rose-100 text-rose-700',
                badgeText: '已驳回',
            };
        default:
            return null;
    }
};

export const NODE_WIDTH = 220;
