import * as React from 'react';
import { cn } from './utils';

/**
 * Select Component
 *
 * Story 9.4 Task 0.3: Simple select dropdown for color scale selector.
 * Provides controlled select with common styling variants.
 */

export interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

export interface SelectProps
    extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
    /** Available options */
    options: SelectOption[];
    /** Current selected value */
    value?: string;
    /** Change handler */
    onChange?: (value: string) => void;
    /** Placeholder when no value selected */
    placeholder?: string;
    /** Visual variant */
    variant?: 'default' | 'outline';
    /** Size variant */
    size?: 'sm' | 'md' | 'lg';
}

/**
 * A styled select component for dropdowns.
 *
 * @example
 * ```tsx
 * <Select
 *   options={[
 *     { value: 'rainbow', label: 'Rainbow' },
 *     { value: 'jet', label: 'Jet' },
 *     { value: 'coolwarm', label: 'Coolwarm' },
 *   ]}
 *   value={colorMap}
 *   onChange={setColorMap}
 * />
 * ```
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    (
        {
            options,
            value,
            onChange,
            placeholder,
            variant = 'default',
            size = 'md',
            className,
            disabled,
            ...props
        },
        ref
    ) => {
        const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
            onChange?.(e.target.value);
        };

        const sizeClasses = {
            sm: 'h-8 text-xs px-2',
            md: 'h-9 text-sm px-3',
            lg: 'h-10 text-base px-4',
        };

        const variantClasses = {
            default: cn(
                'bg-gray-800 border-gray-700 text-white',
                'hover:border-gray-600 focus:border-blue-500',
                'disabled:opacity-50 disabled:cursor-not-allowed'
            ),
            outline: cn(
                'bg-transparent border-gray-600 text-gray-200',
                'hover:border-gray-500 focus:border-blue-400',
                'disabled:opacity-50 disabled:cursor-not-allowed'
            ),
        };

        return (
            <select
                ref={ref}
                value={value}
                onChange={handleChange}
                disabled={disabled}
                className={cn(
                    // Base styles
                    'appearance-none rounded-md border transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                    'cursor-pointer',
                    // Background arrow indicator
                    'bg-no-repeat bg-right pr-8',
                    "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")]",
                    'bg-[length:1.25rem_1.25rem]',
                    // Size and variant
                    sizeClasses[size],
                    variantClasses[variant],
                    className
                )}
                {...props}
            >
                {placeholder && (
                    <option value="" disabled>
                        {placeholder}
                    </option>
                )}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                        {opt.label}
                    </option>
                ))}
            </select>
        );
    }
);

Select.displayName = 'Select';
