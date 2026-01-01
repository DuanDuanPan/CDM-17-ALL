'use client';

/**
 * Story 7.9: ApprovalHistory Component
 *
 * Extracted from ApprovalStatusPanel.tsx (lines 85-161)
 * Displays approval workflow steps in a vertical stepper format.
 *
 * This is a presentational component that receives step data via props.
 * No API calls are made here - follows Hook-First pattern.
 */

import { Check, X, Clock } from 'lucide-react';
import type { ApprovalStep } from '@cdm/types';

// Props for ApprovalHistory
export interface ApprovalHistoryProps {
    steps: ApprovalStep[];
    currentStepIndex: number;
}

/**
 * Step Status Icon
 * Renders the appropriate icon based on step status
 */
function StepIcon({ step, isActive }: { step: ApprovalStep; isActive: boolean }) {
    if (step.status === 'approved') {
        return (
            <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="h-4 w-4 text-white" />
            </div>
        );
    }
    if (step.status === 'rejected') {
        return (
            <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center">
                <X className="h-4 w-4 text-white" />
            </div>
        );
    }
    if (step.status === 'pending' || isActive) {
        return (
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                <Clock className="h-4 w-4 text-white" />
            </div>
        );
    }
    return (
        <div className="h-8 w-8 rounded-full border-2 border-gray-300 flex items-center justify-center">
            <span className="text-xs text-gray-400">{step.index + 1}</span>
        </div>
    );
}

/**
 * ApprovalHistory - Vertical progress tracker for approval steps
 *
 * @param steps - Array of approval steps to display
 * @param currentStepIndex - Index of the current active step
 */
export function ApprovalHistory({ steps, currentStepIndex }: ApprovalHistoryProps) {
    return (
        <div className="space-y-4">
            {steps.map((step, index) => (
                <div key={step.index} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                        <StepIcon step={step} isActive={index === currentStepIndex} />
                        {index < steps.length - 1 && (
                            <div className={`w-0.5 h-8 mt-1 ${step.status === 'approved' ? 'bg-green-500' : 'bg-gray-200'}`} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${step.status === 'approved' ? 'text-green-600' :
                            step.status === 'rejected' ? 'text-red-600' :
                                step.status === 'pending' ? 'text-blue-600' : 'text-gray-700'
                            }`}>
                            {step.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium">
                                {step.assigneeId.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs text-gray-500 truncate">
                                {step.assigneeId}
                            </span>
                        </div>
                        {step.completedAt && (
                            <p className="text-xs text-gray-400 mt-1">
                                {new Date(step.completedAt).toLocaleString()}
                            </p>
                        )}
                        {step.reason && (
                            <p className="text-xs text-red-500 mt-1 italic">
                                驳回原因: {step.reason}
                            </p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

// Maintain backward compatibility with old name
export const ApprovalStepper = ApprovalHistory;

export default ApprovalHistory;
