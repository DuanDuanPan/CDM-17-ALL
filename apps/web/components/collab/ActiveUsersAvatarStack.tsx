'use client';

import { useMemo, useState } from 'react';
import type { AwarenessUser } from '../../hooks/useCollaboration';

export interface ActiveUsersAvatarStackProps {
    users: AwarenessUser[];
    /** Maximum avatars to show before "+N" */
    maxVisible?: number;
    /** Callback when hovering over user to highlight on canvas */
    onUserHover?: (userId: string | null) => void;
    /** Callback when clicking a user to find them */
    onUserClick?: (userId: string) => void;
}

/**
 * ActiveUsersAvatarStack - Overlapping avatar circles showing active collaborators
 *
 * Features:
 * - Overlapping circular avatars (Glassmorphism style)
 * - 2px solid border matching user's cursor color
 * - "+N" bubble for overflow (>3 users)
 * - Tooltip on hover to "Find User"
 *
 * Story 1.4: Real-time Collaboration Engine (UI Design - Magic UI Aesthetic)
 */
export function ActiveUsersAvatarStack({
    users,
    maxVisible = 3,
    onUserHover,
    onUserClick,
}: ActiveUsersAvatarStackProps) {
    const [hoveredUserId, setHoveredUserId] = useState<string | null>(null);

    const visibleUsers = useMemo(() => users.slice(0, maxVisible), [users, maxVisible]);
    const overflowCount = useMemo(() => Math.max(0, users.length - maxVisible), [users, maxVisible]);

    const handleMouseEnter = (userId: string) => {
        setHoveredUserId(userId);
        onUserHover?.(userId);
    };

    const handleMouseLeave = () => {
        setHoveredUserId(null);
        onUserHover?.(null);
    };

    if (users.length === 0) return null;

    return (
        <div className="flex items-center">
            {/* Avatar Stack */}
            <div className="flex -space-x-2">
                {visibleUsers.map((user, index) => (
                    <div
                        key={user.id}
                        className="relative group"
                        style={{ zIndex: visibleUsers.length - index }}
                    >
                        {/* Avatar Button */}
                        <button
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md transition-transform hover:scale-110 hover:z-10"
                            style={{
                                backgroundColor: user.color,
                                border: `2px solid ${user.color}`,
                                boxShadow: `0 0 0 2px white, 0 2px 8px rgba(0,0,0,0.1)`,
                            }}
                            onMouseEnter={() => handleMouseEnter(user.id)}
                            onMouseLeave={handleMouseLeave}
                            onClick={() => onUserClick?.(user.id)}
                            title={`${user.name} - 点击查找`}
                        >
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-full h-full rounded-full object-cover"
                                />
                            ) : (
                                <span>{user.name.charAt(0).toUpperCase()}</span>
                            )}
                        </button>

                        {/* Tooltip on Hover */}
                        <div
                            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md text-xs font-medium text-white whitespace-nowrap transition-opacity ${hoveredUserId === user.id ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                }`}
                            style={{
                                backgroundColor: user.color,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            }}
                        >
                            {user.name}
                            <div
                                className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent"
                                style={{ borderTopColor: user.color }}
                            />
                        </div>
                    </div>
                ))}

                {/* Overflow Count Bubble */}
                {overflowCount > 0 && (
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shadow-md bg-white/80 backdrop-blur-sm text-gray-700"
                        style={{
                            border: '2px solid rgba(209, 213, 219, 0.8)',
                            boxShadow: '0 0 0 2px white, 0 2px 8px rgba(0,0,0,0.1)',
                        }}
                        title={`还有 ${overflowCount} 位用户`}
                    >
                        +{overflowCount}
                    </div>
                )}
            </div>

            {/* Online Indicator */}
            <div className="ml-3 flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span data-testid="active-users-count">{users.length} 在线</span>
            </div>
        </div>
    );
}
