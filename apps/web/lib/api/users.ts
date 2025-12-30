/**
 * Story 7.5: User API Service
 * Centralized API calls for user-related operations
 *
 * Refactoring:
 * - Extracted from UserSelector.tsx direct fetch calls
 * - Extracted from CommentInput.tsx @mention search
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface UserOption {
    id: string;
    name: string | null;
    email: string;
}

/**
 * Search users by query
 * Used by: UserSelector, CommentInput (@mention)
 */
export async function searchUsers(query: string, limit = 20): Promise<UserOption[]> {
    try {
        const response = await fetch(
            `${API_BASE}/api/users/search?q=${encodeURIComponent(query)}&limit=${limit}`
        );
        if (!response.ok) {
            throw new Error(`Failed to search users: ${response.status}`);
        }
        const data = await response.json();
        return data.users || [];
    } catch (error) {
        console.error('[users.api] Error searching users:', error);
        return [];
    }
}

/**
 * Fetch a single user by ID
 * Used by: UserSelector (to display selected user)
 */
export async function fetchUserById(userId: string): Promise<UserOption | null> {
    try {
        const response = await fetch(`${API_BASE}/api/users/${userId}`);
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Failed to fetch user: ${response.status}`);
        }
        const user = await response.json();
        return user
            ? {
                id: user.id,
                name: user.name,
                email: user.email,
            }
            : null;
    } catch (error) {
        console.error('[users.api] Error fetching user:', error);
        return null;
    }
}
