'use client';

/**
 * Story 4.1: Approval Driven Workflow
 * UserSelector Component - Async search dropdown for selecting users
 * Features: Async search, avatar display, keyboard navigation
 *
 * Story 7.5: Refactored to use Hook-First pattern
 * - Removed 2 direct fetch() calls
 * - Now uses useUserSearch hook following Story 7.2 pattern
 */

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from 'react';
import { User, ChevronDown, Search, X, Loader2 } from 'lucide-react';
import { useUserSearch } from '@/hooks/useUserSearch';
import type { UserOption } from '@/lib/api/users';

// Re-export UserOption for consumers
export type { UserOption };

interface UserSelectorProps {
    value?: string;                    // Selected user ID
    onChange: (userId: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    onUserSelect?: (user: UserOption) => void;
}

/**
 * Generate initials from name or email
 */
function getInitials(name: string | null, email: string): string {
    if (name) {
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
}

/**
 * UserSelector - Async search dropdown for selecting users
 */
export function UserSelector({
    value,
    onChange,
    placeholder = '选择用户...',
    disabled = false,
    className = '',
    onUserSelect,
}: UserSelectorProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Story 7.5: Use Hook-First pattern
    const {
        users,
        isLoading,
        search: searchUsers,
        fetchUser,
    } = useUserSearch({ debounceMs: 300, limit: 20 });

    // Fetch selected user info when value changes (for displaying selected user)
    useEffect(() => {
        if (!value) {
            setSelectedUser(null);
            return;
        }

        // If we already have the user with this ID, don't refetch
        if (selectedUser?.id === value) {
            return;
        }

        // Fetch user info by ID using hook
        fetchUser(value).then((user) => {
            if (user) {
                setSelectedUser(user);
            } else {
                // If fetching fails, try to find from users list
                const found = users.find(u => u.id === value);
                if (found) {
                    setSelectedUser(found);
                }
            }
        });
    }, [value, selectedUser?.id, users, fetchUser]);

    // Fetch users when search changes or when dropdown opens
    useEffect(() => {
        if (open) {
            searchUsers(search.trim());
        }
    }, [search, open, searchUsers]);

    // Reset search when popover opens
    useEffect(() => {
        if (open) {
            setSearch('');
            setHighlightedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [open]);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle user selection
    const handleSelect = useCallback((user: UserOption) => {
        setSelectedUser(user);
        onChange(user.id);
        onUserSelect?.(user);
        setOpen(false);
    }, [onChange, onUserSelect]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
        if (users.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev + 1) % users.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev - 1 + users.length) % users.length);
                break;
            case 'Enter':
                e.preventDefault();
                if (users[highlightedIndex]) {
                    handleSelect(users[highlightedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setOpen(false);
                break;
        }
    }, [users, highlightedIndex, handleSelect]);

    // Clear selection
    const handleClear = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedUser(null);
        onChange('');
    }, [onChange]);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Trigger - using div with combobox role to allow nested clear button */}
            <div
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                onClick={() => !disabled && setOpen(!open)}
                onKeyDown={(e) => {
                    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        setOpen(!open);
                    }
                }}
                className={`
          w-full flex items-center justify-between gap-2 px-3 py-2
          text-sm border border-gray-300 rounded-md bg-white cursor-pointer
          hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}
          ${!selectedUser ? 'text-gray-400' : 'text-gray-900'}
        `}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedUser ? (
                        <>
                            <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-medium text-blue-700">
                                {getInitials(selectedUser.name, selectedUser.email)}
                            </div>
                            <span className="truncate">
                                {selectedUser.name || selectedUser.email}
                            </span>
                        </>
                    ) : (
                        <>
                            <User className="h-4 w-4" />
                            <span>{placeholder}</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {selectedUser && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-0.5 hover:bg-gray-100 rounded"
                            aria-label="清除选择"
                        >
                            <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </button>
                    )}
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
            </div>

            {/* Dropdown - using high z-index for modal compatibility */}
            {open && (
                <div className="absolute z-[10000] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-[280px] overflow-hidden" style={{ bottom: 'auto' }}>
                    {/* Search Input */}
                    <div className="flex items-center border-b border-gray-100 px-3">
                        <Search className="h-4 w-4 text-gray-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="搜索用户..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="flex-1 px-2 py-2 text-sm outline-none"
                        />
                        {isLoading && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
                    </div>

                    {/* Results */}
                    <div className="max-h-[200px] overflow-y-auto">
                        {users.length === 0 && search.length > 0 && !isLoading && (
                            <div className="py-6 text-center text-sm text-gray-400">
                                未找到匹配的用户
                            </div>
                        )}
                        {users.length === 0 && search.length === 0 && (
                            <div className="py-6 text-center text-sm text-gray-400">
                                输入关键词搜索用户
                            </div>
                        )}
                        {users.map((user, index) => (
                            <div
                                key={user.id}
                                onClick={() => handleSelect(user)}
                                className={`
                  flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors
                  ${highlightedIndex === index ? 'bg-blue-50' : ''}
                  ${value === user.id ? 'bg-blue-100' : ''}
                  hover:bg-blue-50
                `}
                            >
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700">
                                    {getInitials(user.name, user.email)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {user.name || '未命名用户'}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                        {user.email}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default UserSelector;
