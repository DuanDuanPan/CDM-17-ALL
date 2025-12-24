/**
 * Story 4.3: Contextual Comments & Mentions
 * Unit tests for mention parsing utility
 */

import { parseMentions, buildUserLookup } from '../mention.util';

describe('mention.util', () => {
    describe('buildUserLookup', () => {
        it('should build lookup map with user IDs and names', () => {
            const users = [
                { id: 'user1', name: 'John Doe', email: 'John@Example.com' },
                { id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
            ];

            const lookup = buildUserLookup(users);

            // ID mapping
            expect(lookup.get('user1')).toBe('user1');
            expect(lookup.get('user2')).toBe('user2');

            // Email mapping
            expect(lookup.get('john@example.com')).toBe('user1');
            expect(lookup.get('jane@example.com')).toBe('user2');

            // Name mapping
            expect(lookup.get('John Doe')).toBe('user1');
            expect(lookup.get('Jane Smith')).toBe('user2');

            // Case-insensitive name mapping
            expect(lookup.get('john doe')).toBe('user1');
            expect(lookup.get('jane smith')).toBe('user2');

            // Simple username (no spaces)
            expect(lookup.get('JohnDoe')).toBe('user1');
            expect(lookup.get('johndoe')).toBe('user1');
        });

        it('should handle null names', () => {
            const users = [{ id: 'user1', name: null, email: 'user1@example.com' }];

            const lookup = buildUserLookup(users);

            expect(lookup.get('user1')).toBe('user1');
            expect(lookup.get('user1@example.com')).toBe('user1');
        });
    });

    describe('parseMentions', () => {
        const users = [
            { id: 'user1', name: 'John', email: 'john@example.com' },
            { id: 'user2', name: 'Jane', email: 'jane@example.com' },
            { id: 'user3', name: 'Bob Smith', email: 'bob@example.com' },
            { id: 'user4', name: '王小明', email: 'xiaoming@example.com' },
            { id: 'user5', name: null, email: 'noname@example.com' },
        ];
        const userLookup = buildUserLookup(users);

        it('should parse @username mentions', () => {
            const content = 'Hello @John!';
            const mentions = parseMentions(content, userLookup);
            expect(mentions).toEqual(['user1']);
        });

        it('should parse @"Quoted Name" mentions', () => {
            const content = 'Hello @"Bob Smith"!';
            const mentions = parseMentions(content, userLookup);
            expect(mentions).toEqual(['user3']);
        });

        it('should parse unicode @mentions (e.g. Chinese names)', () => {
            const content = '你好 @王小明';
            const mentions = parseMentions(content, userLookup);
            expect(mentions).toEqual(['user4']);
        });

        it('should parse email mentions when quoted', () => {
            const content = 'Hello @"noname@example.com"';
            const mentions = parseMentions(content, userLookup);
            expect(mentions).toEqual(['user5']);
        });

        it('should parse @{userId} mentions', () => {
            const content = 'Hello @{user2}!';
            const mentions = parseMentions(content, userLookup);
            expect(mentions).toEqual(['user2']);
        });

        it('should parse multiple mentions', () => {
            const content = '@John and @Jane and @"Bob Smith" and @王小明 are working on this';
            const mentions = parseMentions(content, userLookup);
            expect(mentions).toContain('user1');
            expect(mentions).toContain('user2');
            expect(mentions).toContain('user3');
            expect(mentions).toContain('user4');
            expect(mentions.length).toBe(4);
        });

        it('should deduplicate repeated mentions', () => {
            const content = '@John said @John is coming';
            const mentions = parseMentions(content, userLookup);
            expect(mentions).toEqual(['user1']);
        });

        it('should handle no mentions', () => {
            const content = 'Just a regular comment';
            const mentions = parseMentions(content, userLookup);
            expect(mentions).toEqual([]);
        });

        it('should handle empty content', () => {
            const mentions = parseMentions('', userLookup);
            expect(mentions).toEqual([]);
        });

        it('should handle empty user lookup', () => {
            const mentions = parseMentions('@John', new Map());
            expect(mentions).toEqual([]);
        });

        it('should ignore non-existent users', () => {
            const content = '@NonExistentUser is not here';
            const mentions = parseMentions(content, userLookup);
            expect(mentions).toEqual([]);
        });

        it('should handle mentions with surrounding text', () => {
            const content = 'Please review this @John, thanks!';
            const mentions = parseMentions(content, userLookup);
            expect(mentions).toEqual(['user1']);
        });
    });
});
