'use client';

import { useCallback } from 'react';
import type { Node } from '@antv/x6';
import { NodeType, type MindNodeData, type AppProps, type AppExecutionStatus } from '@cdm/types';
import { executeApp } from '@/lib/api/app-library';
import { updateNodeProps } from '@/lib/api/nodes';

export interface UseAppExecutionOptions {
    node: Node;
    getData: () => MindNodeData;
    appRunning: boolean;
    setAppRunning: (running: boolean) => void;
}

export interface UseAppExecutionReturn {
    /** Handle APP node execution */
    handleAppExecute: (e: React.MouseEvent<HTMLButtonElement>) => Promise<void>;
}

/**
 * Hook to handle APP node execution.
 * Story 7.4: Extracted from MindNode for single responsibility.
 * Story 2.9: APP node execution logic.
 */
export function useAppExecution({
    node,
    getData,
    appRunning,
    setAppRunning,
}: UseAppExecutionOptions): UseAppExecutionReturn {
    const handleAppExecute = useCallback(
        async (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            if (appRunning) return;
            const data = getData();
            if ((data.nodeType || NodeType.ORDINARY) !== NodeType.APP) return;

            const appProps = (data.props as AppProps) || {};
            setAppRunning(true);

            if (appProps.appSourceType === 'local' && appProps.appPath) {
                window.alert(
                    `本地应用启动请求 (Mock):\n${appProps.appPath}\n\n需要 OS 协议处理器支持。`
                );
            }

            try {
                const result = await executeApp(node.id, {
                    appSourceType: appProps.appSourceType ?? 'library',
                    appPath: appProps.appPath ?? null,
                    appUrl: appProps.appUrl ?? null,
                    libraryAppId: appProps.libraryAppId ?? null,
                    libraryAppName: appProps.libraryAppName ?? null,
                    inputs: appProps.inputs || [],
                    outputs: appProps.outputs || [],
                });

                if (result?.error) {
                    throw new Error(result.error);
                }

                const successProps: AppProps = {
                    ...appProps,
                    outputs: result.outputs || [],
                    executionStatus: 'success' as AppExecutionStatus,
                    lastExecutedAt: result.executedAt ?? new Date().toISOString(),
                    errorMessage: null,
                };

                const prevData = node.getData() || {};
                node.setData({
                    ...prevData,
                    props: successProps,
                    updatedAt: new Date().toISOString(),
                } as Partial<MindNodeData>);

                updateNodeProps(node.id, NodeType.APP, successProps).catch((err) => {
                    console.error('[MindNode] Failed to persist APP execution props:', err);
                });
            } catch (err) {
                const message = err instanceof Error ? err.message : '执行失败';
                const errorProps: AppProps = {
                    ...appProps,
                    executionStatus: 'error' as AppExecutionStatus,
                    errorMessage: message,
                    lastExecutedAt: new Date().toISOString(),
                };
                const prevData = node.getData() || {};
                node.setData({
                    ...prevData,
                    props: errorProps,
                    updatedAt: new Date().toISOString(),
                } as Partial<MindNodeData>);

                updateNodeProps(node.id, NodeType.APP, errorProps).catch((err) => {
                    console.error('[MindNode] Failed to persist APP execution props:', err);
                });
            } finally {
                setAppRunning(false);
            }
        },
        [appRunning, getData, node, setAppRunning]
    );

    return { handleAppExecute };
}
