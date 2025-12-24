/**
 * Story 2.6: Multi-Select & Clipboard
 * Unit tests for clipboard types and parseClipboardData function
 */

import { describe, it, expect } from 'vitest';
import {
    parseClipboardData,
    ClipboardData,
    ClipboardDataSchema,
    CLIPBOARD_VERSION,
    CLIPBOARD_SOURCE,
    MAX_CLIPBOARD_NODES,
    NodeType,
} from '../src';

describe('Clipboard Types', () => {
    // Valid clipboard data for testing
    const validClipboardData: ClipboardData = {
        version: '1.0',
        source: 'cdm-17',
        timestamp: Date.now(),
        operation: 'copy',
        sourceGraphId: 'graph-123',
        nodes: [
            {
                originalId: 'node-1',
                label: 'Test Node 1',
                type: NodeType.ORDINARY,
                x: 0,
                y: 0,
                width: 160,
                height: 50,
                metadata: {},
            },
            {
                originalId: 'node-2',
                label: 'Test Node 2',
                type: NodeType.TASK,
                x: 200,
                y: 100,
                width: 160,
                height: 80,
                parentOriginalId: 'node-1',
                description: 'A task node',
                metadata: { assignee: 'user-1' },
                tags: ['important', 'urgent'],
            },
        ],
        edges: [
            {
                sourceOriginalId: 'node-1',
                targetOriginalId: 'node-2',
                kind: 'hierarchical',
            },
        ],
        layout: {
            minX: 0,
            minY: 0,
            width: 360,
            height: 180,
            center: { x: 180, y: 90 },
        },
    };

    describe('Constants', () => {
        it('should export correct version constant', () => {
            expect(CLIPBOARD_VERSION).toBe('1.0');
        });

        it('should export correct source constant', () => {
            expect(CLIPBOARD_SOURCE).toBe('cdm-17');
        });

        it('should export reasonable max nodes limit', () => {
            expect(MAX_CLIPBOARD_NODES).toBe(100);
            expect(MAX_CLIPBOARD_NODES).toBeGreaterThan(0);
        });
    });

    describe('ClipboardDataSchema', () => {
        it('should validate correct clipboard data', () => {
            const result = ClipboardDataSchema.safeParse(validClipboardData);
            expect(result.success).toBe(true);
        });

        it('should accept clipboard data without operation', () => {
            const { operation, ...withoutOperation } = validClipboardData;
            const result = ClipboardDataSchema.safeParse(withoutOperation);
            expect(result.success).toBe(true);
        });

        it('should reject data with wrong source', () => {
            const invalidData = {
                ...validClipboardData,
                source: 'other-app',
            };
            const result = ClipboardDataSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject data with missing required fields', () => {
            const invalidData = {
                version: '1.0',
                source: 'cdm-17',
                // missing timestamp, sourceGraphId, nodes, edges, layout
            };
            const result = ClipboardDataSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should reject nodes with invalid NodeType', () => {
            const invalidData = {
                ...validClipboardData,
                nodes: [
                    {
                        ...validClipboardData.nodes[0],
                        type: 'INVALID_TYPE',
                    },
                ],
            };
            const result = ClipboardDataSchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });

        it('should accept data with dependency edges', () => {
            const dataWithDependency = {
                ...validClipboardData,
                edges: [
                    {
                        sourceOriginalId: 'node-1',
                        targetOriginalId: 'node-2',
                        kind: 'dependency',
                        dependencyType: 'FS',
                    },
                ],
            };
            const result = ClipboardDataSchema.safeParse(dataWithDependency);
            expect(result.success).toBe(true);
        });

        it('should accept empty nodes and edges arrays', () => {
            const emptyData = {
                ...validClipboardData,
                nodes: [],
                edges: [],
            };
            const result = ClipboardDataSchema.safeParse(emptyData);
            expect(result.success).toBe(true);
        });
    });

    describe('parseClipboardData', () => {
        it('should parse valid JSON string', () => {
            const jsonStr = JSON.stringify(validClipboardData);
            const result = parseClipboardData(jsonStr);

            expect(result).not.toBeNull();
            expect(result?.version).toBe('1.0');
            expect(result?.source).toBe('cdm-17');
            expect(result?.nodes.length).toBe(2);
            expect(result?.edges.length).toBe(1);
            expect(result?.operation).toBe('copy');
        });

        it('should return null for invalid JSON', () => {
            const result = parseClipboardData('not valid json');
            expect(result).toBeNull();
        });

        it('should return null for empty string', () => {
            const result = parseClipboardData('');
            expect(result).toBeNull();
        });

        it('should return null for valid JSON but invalid structure', () => {
            const result = parseClipboardData('{"foo": "bar"}');
            expect(result).toBeNull();
        });

        it('should return null for JSON from other applications', () => {
            const otherAppData = JSON.stringify({
                version: '1.0',
                source: 'other-app',
                timestamp: Date.now(),
                data: 'some other data',
            });
            const result = parseClipboardData(otherAppData);
            expect(result).toBeNull();
        });

        it('should preserve all node data including tags', () => {
            const jsonStr = JSON.stringify(validClipboardData);
            const result = parseClipboardData(jsonStr);

            expect(result?.nodes[1].tags).toEqual(['important', 'urgent']);
            expect(result?.nodes[1].description).toBe('A task node');
            expect(result?.nodes[1].metadata).toEqual({ assignee: 'user-1' });
        });

        it('should preserve layout information', () => {
            const jsonStr = JSON.stringify(validClipboardData);
            const result = parseClipboardData(jsonStr);

            expect(result?.layout.center).toEqual({ x: 180, y: 90 });
            expect(result?.layout.width).toBe(360);
            expect(result?.layout.height).toBe(180);
        });

        it('should handle edge with dependency type', () => {
            const dataWithDependency = {
                ...validClipboardData,
                edges: [
                    {
                        sourceOriginalId: 'node-1',
                        targetOriginalId: 'node-2',
                        kind: 'dependency' as const,
                        dependencyType: 'FS' as const,
                        label: 'depends on',
                    },
                ],
            };
            const jsonStr = JSON.stringify(dataWithDependency);
            const result = parseClipboardData(jsonStr);

            expect(result?.edges[0].kind).toBe('dependency');
            expect(result?.edges[0].dependencyType).toBe('FS');
            expect(result?.edges[0].label).toBe('depends on');
        });
    });

    describe('Cross-graph paste scenarios', () => {
        it('should preserve sourceGraphId for cross-graph paste detection', () => {
            const jsonStr = JSON.stringify(validClipboardData);
            const result = parseClipboardData(jsonStr);

            expect(result?.sourceGraphId).toBe('graph-123');
        });

        it('should handle nodes with parent references', () => {
            const jsonStr = JSON.stringify(validClipboardData);
            const result = parseClipboardData(jsonStr);

            // First node has no parent
            expect(result?.nodes[0].parentOriginalId).toBeUndefined();

            // Second node references first node as parent
            expect(result?.nodes[1].parentOriginalId).toBe('node-1');
        });
    });
});
