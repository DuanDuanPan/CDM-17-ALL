/**
 * Story 4.3: Contextual Comments & Mentions
 * Utility functions for parsing @mentions from comment content
 *
 * HIGH-4 Fix: Updated regex to support Unicode characters (Chinese names)
 */

/**
 * Regular expression pattern for matching @mentions
 * Supports:
 * - @username (alphanumeric with underscores)
 * - @{userId} (user ID in braces)
 * - @中文名 (Unicode characters including CJK)
 * - @"User Name" (quoted names with spaces)
 *
 * Uses Unicode property escapes for better i18n support
 */
const MENTION_REGEX = /@(?:(\{[a-z0-9-]+\})|"([^"]+)"|([\p{L}\p{N}_]+))/giu;

/**
 * Parse @mentions from comment content
 * Returns array of user IDs from the userLookup map
 *
 * @param content - Comment text to parse
 * @param userLookup - Map of username/name -> userId
 * @returns Array of unique user IDs mentioned in the content
 */
export function parseMentions(
    content: string,
    userLookup: Map<string, string>
): string[] {
    if (!content || userLookup.size === 0) {
        return [];
    }

    const matches = content.matchAll(MENTION_REGEX);
    const userIds: string[] = [];

    for (const match of matches) {
        // match[1] = {userId}, match[2] = "quoted name", match[3] = unquoted name
        let ref: string;
        if (match[1]) {
            // {userId} format - remove braces
            ref = match[1].replace(/[{}]/g, '');
        } else if (match[2]) {
            // "Quoted Name" format
            ref = match[2];
        } else if (match[3]) {
            // Plain @name format
            ref = match[3];
        } else {
            continue;
        }

        // Check if the reference exists in the lookup (case-insensitive)
        const normalizedRef = ref.toLowerCase();
        if (userLookup.has(normalizedRef)) {
            userIds.push(userLookup.get(normalizedRef)!);
        } else if (userLookup.has(ref)) {
            // Try exact match as fallback
            userIds.push(userLookup.get(ref)!);
        }
    }

    // Return unique user IDs only
    return [...new Set(userIds)];
}

/**
 * Build a user lookup map from user list
 * Maps both username (name) and userId to userId
 * 
 * @param users - Array of user objects with id and name
 * @returns Map for use with parseMentions
 */
export function buildUserLookup(
    users: Array<{ id: string; name: string | null; email?: string | null }>
): Map<string, string> {
    const lookup = new Map<string, string>();

    for (const user of users) {
        // Map userId to itself (for @{userId} format)
        lookup.set(user.id, user.id);

        // Map email to userId (for @"user@example.com" format)
        if (user.email) {
            lookup.set(user.email, user.id);
            lookup.set(user.email.toLowerCase(), user.id);
        }

        // Map name to userId (for @username format)
        if (user.name) {
            // Also support lowercase lookups for case-insensitive matching
            lookup.set(user.name, user.id);
            lookup.set(user.name.toLowerCase(), user.id);

            // Support names without spaces as simple mentions
            const simpleUsername = user.name.replace(/\s+/g, '');
            if (simpleUsername && simpleUsername !== user.name) {
                lookup.set(simpleUsername, user.id);
                lookup.set(simpleUsername.toLowerCase(), user.id);
            }
        }
    }

    return lookup;
}
