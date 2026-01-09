'use client';

/**
 * Story 8.8: Semantic Zoom LOD
 * Component tests for LOD rendering (RichNode + OrdinaryNode)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { NodeType, type MindNodeData } from '@cdm/types';
import { RichNode } from '@/components/nodes/RichNode';
import { OrdinaryNode } from '@/components/nodes/OrdinaryNode';

describe('Semantic Zoom LOD components', () => {
    it('RichNode: full shows metrics/tags/footer', () => {
        const containerRef = React.createRef<HTMLDivElement>();
        const titleMeasureRef = React.createRef<HTMLDivElement>();
        const titleInputRef = React.createRef<HTMLInputElement>();

        const data: MindNodeData = {
            id: 'lod-rich',
            label: 'LOD Rich',
            nodeType: NodeType.REQUIREMENT,
            props: { reqType: 'functional', priority: 'must' },
            tags: ['alpha', 'beta'],
        };

        render(
            <RichNode
                containerRef={containerRef}
                titleMeasureRef={titleMeasureRef}
                titleInputRef={titleInputRef}
                nodeId="lod-rich"
                nodeType={NodeType.REQUIREMENT}
                data={data}
                label="LOD Rich"
                setLabel={() => { }}
                tags={['alpha', 'beta']}
                isEditing={false}
                isSelected={false}
                isWatched={false}
                isTaskDone={false}
                appRunning={false}
                unreadCount={0}
                approvalDecoration={null}
                pill={null}
                handleKeyDown={() => { }}
                handleAppExecute={() => { }}
                handleOpenComments={() => { }}
                startEditing={() => { }}
                lod="full"
            />
        );

        expect(screen.getByTestId('rich-node-metrics')).toBeTruthy();
        expect(screen.getByTestId('rich-node-tags')).toBeTruthy();
        expect(screen.getByTestId('rich-node-footer')).toBeTruthy();
    });

    it('RichNode: compact hides metrics/tags/footer', () => {
        const containerRef = React.createRef<HTMLDivElement>();
        const titleMeasureRef = React.createRef<HTMLDivElement>();
        const titleInputRef = React.createRef<HTMLInputElement>();

        const data: MindNodeData = {
            id: 'lod-rich',
            label: 'LOD Rich',
            nodeType: NodeType.REQUIREMENT,
            props: { reqType: 'functional', priority: 'must' },
            tags: ['alpha', 'beta'],
        };

        render(
            <RichNode
                containerRef={containerRef}
                titleMeasureRef={titleMeasureRef}
                titleInputRef={titleInputRef}
                nodeId="lod-rich"
                nodeType={NodeType.REQUIREMENT}
                data={data}
                label="LOD Rich"
                setLabel={() => { }}
                tags={['alpha', 'beta']}
                isEditing={false}
                isSelected={false}
                isWatched={false}
                isTaskDone={false}
                appRunning={false}
                unreadCount={0}
                approvalDecoration={null}
                pill={null}
                handleKeyDown={() => { }}
                handleAppExecute={() => { }}
                handleOpenComments={() => { }}
                startEditing={() => { }}
                lod="compact"
            />
        );

        expect(screen.queryByTestId('rich-node-metrics')).toBeNull();
        expect(screen.queryByTestId('rich-node-tags')).toBeNull();
        expect(screen.queryByTestId('rich-node-footer')).toBeNull();
    });

    it('RichNode: micro shows marker and hides title', () => {
        const containerRef = React.createRef<HTMLDivElement>();
        const titleMeasureRef = React.createRef<HTMLDivElement>();
        const titleInputRef = React.createRef<HTMLInputElement>();

        const data: MindNodeData = {
            id: 'lod-rich',
            label: 'LOD Rich',
            nodeType: NodeType.REQUIREMENT,
            props: { reqType: 'functional', priority: 'must' },
            tags: ['alpha', 'beta'],
        };

        render(
            <RichNode
                containerRef={containerRef}
                titleMeasureRef={titleMeasureRef}
                titleInputRef={titleInputRef}
                nodeId="lod-rich"
                nodeType={NodeType.REQUIREMENT}
                data={data}
                label="LOD Rich"
                setLabel={() => { }}
                tags={['alpha', 'beta']}
                isEditing={false}
                isSelected={false}
                isWatched={false}
                isTaskDone={false}
                appRunning={false}
                unreadCount={0}
                approvalDecoration={null}
                pill={null}
                handleKeyDown={() => { }}
                handleAppExecute={() => { }}
                handleOpenComments={() => { }}
                startEditing={() => { }}
                lod="micro"
            />
        );

        expect(screen.getByTestId('rich-node-micro')).toBeTruthy();
        expect(screen.queryByTestId('mind-node-title')).toBeNull();
    });

    it('OrdinaryNode: micro shows marker and hides title', () => {
        const containerRef = React.createRef<HTMLDivElement>();
        const titleMeasureRef = React.createRef<HTMLDivElement>();
        const titleInputRef = React.createRef<HTMLInputElement>();

        render(
            <OrdinaryNode
                containerRef={containerRef}
                containerClasses="relative w-full h-full"
                titleMeasureRef={titleMeasureRef}
                titleInputRef={titleInputRef}
                label="LOD Ordinary"
                setLabel={() => { }}
                isEditing={false}
                isWatched={false}
                getData={() => ({ isEditing: false } as unknown as MindNodeData)}
                commit={() => { }}
                handleKeyDown={() => { }}
                startEditing={() => { }}
                lod="micro"
            />
        );

        expect(screen.getByTestId('mind-node-micro')).toBeTruthy();
        expect(screen.queryByTestId('mind-node-title')).toBeNull();
    });
});

