'use client';

/**
 * Story 8.5: Focus Mode Toggle Button (AC1, AC3)
 *
 * Toolbar button with inline level selector.
 * - Click main button: Toggle focus mode on/off
 * - Level buttons: Select focus level (1/2/3 layers)
 * Uses glassmorphism styling consistent with ZoomIndicator.
 */

import { useState, useRef, useEffect } from 'react';
import { Button, cn } from '@cdm/ui';
import { Focus, ChevronDown } from 'lucide-react';

export interface FocusModeButtonProps {
    /** Whether focus mode is active */
    isFocusMode: boolean;
    /** Current focus level (1-3) */
    focusLevel: 1 | 2 | 3;
    /** Toggle focus mode on/off */
    onToggle: () => void;
    /** Set focus level */
    onSetLevel: (level: 1 | 2 | 3) => void;
    /** Whether interactions are disabled (e.g., graph not ready) */
    disabled?: boolean;
    /** Whether a node is selected (focus mode requires selection) */
    hasSelection?: boolean;
    className?: string;
}

const LEVELS: Array<{ value: 1 | 2 | 3; label: string; description: string }> = [
    { value: 1, label: '1 层', description: '直接关联' },
    { value: 2, label: '2 层', description: '扩展范围' },
    { value: 3, label: '3 层', description: '最大范围' },
];

/**
 * Focus mode toggle button with level dropdown.
 * Position: In View Controls stack, bottom-right.
 */
export function FocusModeButton({
    isFocusMode,
    focusLevel,
    onToggle,
    onSetLevel,
    disabled = false,
    hasSelection = false,
    className,
}: FocusModeButtonProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Disable toggle button when no node is selected (AC5: 无选中时不操作)
    const canToggle = !disabled && hasSelection;

    // Close dropdown when exiting focus mode (prevents menu lingering)
    useEffect(() => {
        if (!isFocusMode) {
            setIsDropdownOpen(false);
        }
    }, [isFocusMode]);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isDropdownOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isDropdownOpen]);

    // Close dropdown on Escape
    useEffect(() => {
        if (!isDropdownOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isDropdownOpen]);

    const handleLevelSelect = (level: 1 | 2 | 3) => {
        onSetLevel(level);
        setIsDropdownOpen(false);
    };

    return (
        <div
            ref={dropdownRef}
            className={cn(
                "relative inline-flex items-center rounded-md",
                "bg-background/80 backdrop-blur-sm",
                "border border-border/50",
                className
            )}
            data-testid="focus-mode-controls"
        >
            {/* Main toggle button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                disabled={!canToggle}
                data-testid="focus-mode-button"
                aria-label={isFocusMode ? '退出聚焦模式' : '进入聚焦模式'}
                aria-pressed={isFocusMode}
                title={
                    !hasSelection
                        ? '请先选中一个节点'
                        : isFocusMode
                          ? '退出聚焦模式 (F)'
                          : '进入聚焦模式 (F)'
                }
                className={cn(
                    "px-2 py-1 h-8 text-xs",
                    "hover:bg-muted/50",
                    "transition-colors duration-150",
                    // Only round right side when level selector is hidden
                    !isFocusMode && "rounded-md",
                    isFocusMode && "rounded-r-none border-r border-border/50",
                    isFocusMode && "bg-primary/10 text-primary"
                )}
            >
                <Focus
                    className={cn(
                        "w-3.5 h-3.5 mr-1.5",
                        isFocusMode && "text-primary"
                    )}
                />
                <span className="hidden sm:inline">
                    {isFocusMode ? '聚焦中' : '聚焦'}
                </span>
            </Button>

            {/* Separator + Level dropdown - only visible when focus mode is active */}
            {isFocusMode && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    disabled={disabled}
                    data-testid="focus-level-dropdown"
                    aria-label={`聚焦层级: ${focusLevel} 层`}
                    aria-haspopup="listbox"
                    aria-expanded={isDropdownOpen}
                    title="选择聚焦层级"
                    className={cn(
                        "px-1.5 py-1 h-8 rounded-l-none",
                        "text-xs tabular-nums text-muted-foreground",
                        "hover:bg-muted/50",
                        "transition-colors duration-150"
                    )}
                >
                    <span className="mr-0.5">{focusLevel}</span>
                    <ChevronDown className={cn(
                        "w-3 h-3 transition-transform duration-150",
                        isDropdownOpen && "rotate-180"
                    )} />
                </Button>
            )}

            {/* Dropdown menu */}
            {isFocusMode && isDropdownOpen && (
                <div
                    className={cn(
                        "absolute right-0 bottom-full mb-1",
                        "w-36 py-1",
                        "bg-background/95 backdrop-blur-sm",
                        "border border-border/50 rounded-md shadow-lg",
                        "z-50"
                    )}
                    role="listbox"
                    aria-label="聚焦层级选择"
                    data-testid="focus-level-dropdown-menu"
                >
                    {LEVELS.map(({ value, label, description }) => (
                        <button
                            key={value}
                            onClick={() => handleLevelSelect(value)}
                            data-testid={`focus-level-${value}`}
                            role="option"
                            aria-selected={focusLevel === value}
                            className={cn(
                                "w-full px-3 py-1.5 text-left text-xs",
                                "hover:bg-muted/50",
                                "transition-colors duration-100",
                                focusLevel === value && "bg-primary/10 text-primary font-medium"
                            )}
                        >
                            <span className="font-medium">{label}</span>
                            <span className="ml-1 text-muted-foreground">- {description}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default FocusModeButton;
