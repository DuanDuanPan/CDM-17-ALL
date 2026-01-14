/**
 * Story 9.9: Scope Selector Component
 * Task 1.3: Search scope dropdown (AC3)
 * 
 * Features:
 * - Three options: current-node, all, unlinked
 * - Icon + label + description for each option
 * - Default value: current-node
 * - Immediate result refresh on change
 */

'use client';

import { useState, useCallback, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, MapPin, Globe, Link2Off } from 'lucide-react';
import { cn } from '@cdm/ui';
import type { SearchScope } from './types';
import { SCOPE_OPTIONS } from './types';

export interface ScopeSelectorProps {
    /** Current scope value */
    value: SearchScope;
    /** Callback when scope changes */
    onChange: (scope: SearchScope) => void;
    /** Whether the selector is disabled */
    disabled?: boolean;
    /** Disable "current-node" option (e.g., no node selected) */
    disableCurrentNode?: boolean;
    /** Custom class name */
    className?: string;
}

const SCOPE_ICONS: Record<SearchScope, typeof MapPin> = {
    'current-node': MapPin,
    'all': Globe,
    'unlinked': Link2Off,
};

export function ScopeSelector({
    value,
    onChange,
    disabled = false,
    disableCurrentNode = false,
    className,
}: ScopeSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const listboxId = useId();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isOptionDisabled = useCallback(
        (scope: SearchScope) => disableCurrentNode && scope === 'current-node',
        [disableCurrentNode]
    );

    const getFirstEnabledIndex = useCallback(() => {
        const index = SCOPE_OPTIONS.findIndex((opt) => !isOptionDisabled(opt.value));
        return index === -1 ? 0 : index;
    }, [isOptionDisabled]);

    const focusOptionAt = useCallback((index: number) => {
        optionRefs.current[index]?.focus();
    }, []);

    const focusNextOption = useCallback((fromIndex: number, direction: 1 | -1) => {
        const length = SCOPE_OPTIONS.length;
        if (length === 0) return;

        let nextIndex = fromIndex;
        for (let i = 0; i < length; i += 1) {
            nextIndex = (nextIndex + direction + length) % length;
            if (!isOptionDisabled(SCOPE_OPTIONS[nextIndex]!.value)) break;
        }

        focusOptionAt(nextIndex);
    }, [focusOptionAt, isOptionDisabled]);

    // When opening, focus the selected option (or first enabled if selected is disabled)
    useEffect(() => {
        if (!isOpen) return;

        const selectedIndex = Math.max(
            0,
            SCOPE_OPTIONS.findIndex((opt) => opt.value === value)
        );

        const initialIndex = isOptionDisabled(SCOPE_OPTIONS[selectedIndex]!.value)
            ? getFirstEnabledIndex()
            : selectedIndex;

        requestAnimationFrame(() => optionRefs.current[initialIndex]?.focus());
    }, [getFirstEnabledIndex, isOpen, isOptionDisabled, value]);

    const handleSelect = useCallback((scope: SearchScope) => {
        onChange(scope);
        setIsOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
    }, [onChange]);

    const currentOption = SCOPE_OPTIONS.find((opt) => opt.value === value)!;
    const CurrentIcon = SCOPE_ICONS[value];

    const handleTriggerKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;

        if (event.key === 'Escape' && isOpen) {
            event.preventDefault();
            setIsOpen(false);
            return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIsOpen(true);
        }
    }, [disabled, isOpen]);

    const handleOptionKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            setIsOpen(false);
            requestAnimationFrame(() => triggerRef.current?.focus());
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            focusNextOption(index, 1);
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            focusNextOption(index, -1);
        }

        if (event.key === 'Home') {
            event.preventDefault();
            focusOptionAt(getFirstEnabledIndex());
        }

        if (event.key === 'End') {
            event.preventDefault();
            const lastEnabledIndex = (() => {
                for (let i = SCOPE_OPTIONS.length - 1; i >= 0; i -= 1) {
                    if (!isOptionDisabled(SCOPE_OPTIONS[i]!.value)) return i;
                }
                return 0;
            })();
            focusOptionAt(lastEnabledIndex);
        }
    }, [focusNextOption, focusOptionAt, getFirstEnabledIndex, isOptionDisabled]);

    return (
        <div
            ref={containerRef}
            className={cn('relative', className)}
            data-testid="scope-selector"
        >
            {/* Trigger button */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                onKeyDown={handleTriggerKeyDown}
                disabled={disabled}
                ref={triggerRef}
                className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
                    'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
                    'hover:bg-gray-50 dark:hover:bg-gray-700',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
                    disabled && 'opacity-50 cursor-not-allowed',
                    isOpen && 'ring-2 ring-blue-500/20 border-blue-500'
                )}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={listboxId}
                data-testid="scope-selector-trigger"
            >
                <CurrentIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{currentOption.label}</span>
                <ChevronDown
                    className={cn(
                        'w-4 h-4 text-gray-400 transition-transform',
                        isOpen && 'rotate-180'
                    )}
                />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div
                    className={cn(
                        'absolute top-full left-0 mt-1 w-64 z-50',
                        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                        'rounded-lg shadow-lg overflow-hidden'
                    )}
                    role="listbox"
                    id={listboxId}
                    data-testid="scope-selector-dropdown"
                >
                    {SCOPE_OPTIONS.map((option, index) => {
                        const Icon = SCOPE_ICONS[option.value];
                        const isSelected = option.value === value;
                        const optionDisabled = isOptionDisabled(option.value);

                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                aria-disabled={optionDisabled}
                                disabled={optionDisabled}
                                onClick={() => handleSelect(option.value)}
                                onKeyDown={(e) => handleOptionKeyDown(e, index)}
                                ref={(el) => {
                                    optionRefs.current[index] = el;
                                }}
                                className={cn(
                                    'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                                    optionDisabled
                                        ? 'opacity-50 cursor-not-allowed'
                                        : isSelected
                                            ? 'bg-blue-50 dark:bg-blue-900/30'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                )}
                                data-testid={`scope-option-${option.value}`}
                            >
                                <Icon
                                    className={cn(
                                        'w-4 h-4 mt-0.5 flex-shrink-0',
                                        isSelected && !optionDisabled
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-gray-500 dark:text-gray-400'
                                    )}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={cn(
                                                'font-medium text-sm',
                                                isSelected && !optionDisabled
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : 'text-gray-700 dark:text-gray-300'
                                            )}
                                        >
                                            {option.label}
                                        </span>
                                        {isSelected && (
                                            <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {option.description}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default ScopeSelector;
