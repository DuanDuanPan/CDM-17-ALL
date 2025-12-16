'use client';

import { useMemo } from 'react';
import type { AwarenessUser } from '../../hooks/useCollaboration';

export interface RemoteCursorProps {
    user: AwarenessUser;
    /** Canvas offset for coordinate transformation */
    canvasOffset?: { x: number; y: number };
    /** Scale factor for zoom */
    scale?: number;
}

/**
 * RemoteCursor - Renders a remote user's cursor on the canvas
 *
 * Features:
 * - Sleek vector arrow (SVG) design
 * - Rounded pulsing label bubble
 * - Smooth CSS transitions for fluid movement
 * - User-specific colors from harmonious palette
 *
 * Story 1.4: Real-time Collaboration Engine (UI Design - Magic UI Aesthetic)
 */
export function RemoteCursor({
    user,
    canvasOffset = { x: 0, y: 0 },
    scale = 1,
}: RemoteCursorProps) {
    // Don't render if no cursor position
    if (!user.cursor) return null;

    // Calculate screen position from canvas coordinates
    const screenX = user.cursor.x * scale + canvasOffset.x;
    const screenY = user.cursor.y * scale + canvasOffset.y;

    return (
        <div
            className="pointer-events-none fixed z-[9999] flex flex-col items-start"
            data-testid="remote-cursor"
            data-user-id={user.id}
            style={{
                left: screenX,
                top: screenY,
                transform: 'translate(0, 0)',
                transition: 'left 100ms linear, top 100ms linear',
            }}
        >
            {/* Cursor Arrow - SVG */}
            <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
            >
                <path
                    d="M5.5 3.5L18.5 12L12 14L9.5 20.5L5.5 3.5Z"
                    fill={user.color}
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />
            </svg>

            {/* User Label Bubble */}
            <div
                className="ml-3 -mt-1 flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white shadow-lg animate-pulse"
                style={{
                    backgroundColor: user.color,
                    animationDuration: '2s',
                }}
            >
                {user.avatar && (
                    <img
                        src={user.avatar}
                        alt=""
                        className="w-4 h-4 rounded-full border border-white/30"
                    />
                )}
                <span className="max-w-[80px] truncate">{user.name}</span>
            </div>
        </div>
    );
}

export interface RemoteCursorsOverlayProps {
    users: AwarenessUser[];
    canvasOffset?: { x: number; y: number };
    scale?: number;
}

/**
 * RemoteCursorsOverlay - Container for all remote cursors
 *
 * Renders as a fixed overlay on top of the canvas
 */
export function RemoteCursorsOverlay({
    users,
    canvasOffset,
    scale,
}: RemoteCursorsOverlayProps) {
    // Filter users with cursor positions
    const usersWithCursors = useMemo(() =>
        users.filter(u => u.cursor),
        [users]
    );

    if (usersWithCursors.length === 0) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-[9999]">
            {usersWithCursors.map((user) => (
                <RemoteCursor
                    key={user.id}
                    user={user}
                    canvasOffset={canvasOffset}
                    scale={scale}
                />
            ))}
        </div>
    );
}
