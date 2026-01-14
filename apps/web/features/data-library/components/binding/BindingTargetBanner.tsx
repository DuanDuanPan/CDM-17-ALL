'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@cdm/ui';
import type { Graph } from '@antv/x6';
import { useDataLibraryBinding } from '../../contexts';
import { useGraphContextOptional } from '@/contexts';

function getNodeLabelFromGraph(graph: Graph | null, nodeId: string) {
  if (!graph) return null;
  const cell = graph.getCellById(nodeId);
  if (!cell || !cell.isNode()) return null;

  const data = cell.getData?.() as { label?: unknown } | undefined;
  const labelFromData = typeof data?.label === 'string' ? data.label : null;
  if (labelFromData) return labelFromData;

  const maybeAttrs = cell.getAttrs?.() as { text?: { text?: unknown } } | undefined;
  const labelFromAttrs = typeof maybeAttrs?.text?.text === 'string' ? maybeAttrs.text.text : null;
  if (labelFromAttrs) return labelFromAttrs;

  return null;
}

export function BindingTargetBanner() {
  const { targetNodeId, exitBindingMode } = useDataLibraryBinding();
  const graphContext = useGraphContextOptional();

  const nodeLabel = useMemo(() => {
    if (!targetNodeId) return null;
    return getNodeLabelFromGraph(graphContext?.graph ?? null, targetNodeId) ?? '未命名节点';
  }, [graphContext?.graph, targetNodeId]);

  if (!targetNodeId) return null;

  return (
    <div
      data-testid="binding-target-banner"
      className="w-full h-14 px-6 flex items-center justify-between bg-gradient-to-r from-blue-500 to-violet-600 text-white shadow-md"
    >
      <div className="font-medium text-base tracking-tight flex items-center gap-2">
        <span aria-hidden>🎯</span>
        <span className="truncate">
          即将绑定资产到节点: <span className="font-semibold">{nodeLabel}</span>
        </span>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        data-testid="binding-target-clear"
        aria-label="清除选择"
        title="清除选择"
        onClick={exitBindingMode}
        className="text-white/80 hover:text-white hover:bg-white/10 rounded-full"
      >
        <X className="w-5 h-5" />
      </Button>
    </div>
  );
}

export default BindingTargetBanner;
