'use client';
import { useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Badge, cn } from '@cdm/ui';
import { X, Search, Link2, Loader2 } from 'lucide-react';
import { useGraphContext } from '@/contexts/GraphContext';
import { useAssetLinks } from '@/features/data-library/hooks/useAssetLinks';
import { LINK_TYPE_OPTIONS, type SelectableNode } from '@/features/data-library/utils/linkAssetDialog';
import { NodeType } from '@cdm/types';
import type { DataLinkType } from '@cdm/types';

export interface LinkAssetDialogProps {
  assetId: string;
  assetName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}
export function LinkAssetDialog({
  assetId,
  assetName,
  onClose,
  onSuccess,
}: LinkAssetDialogProps) {
  const { graph } = useGraphContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<DataLinkType>('reference');
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectableNodes = useMemo<SelectableNode[]>(() => {
    if (!graph) return [];
    const nodes = graph.getNodes();
    const result: SelectableNode[] = [];
    for (const node of nodes) {
      const data = node.getData() || {};
      const nodeType = (data.nodeType ?? data.type) as NodeType | undefined;
      if (nodeType === NodeType.TASK || nodeType === NodeType.DATA) {
        result.push({
          id: node.id,
          label: (data.label as string) || node.id,
          type: nodeType,
        });
      }
    }
    return result;
  }, [graph]);
  const filteredNodes = useMemo(() => {
    if (!searchTerm) return selectableNodes;
    const lower = searchTerm.toLowerCase();
    return selectableNodes.filter((n) => n.label.toLowerCase().includes(lower));
  }, [selectableNodes, searchTerm]);
  const { linkAsset } = useAssetLinks({
    nodeId: selectedNodeId || '',
    enabled: false, // Don't fetch existing links
  });
  const handleConfirm = useCallback(async () => {
    if (!selectedNodeId) {
      setError('请选择一个节点');
      return;
    }

    setIsLinking(true);
    setError(null);

    try {
      const success = await linkAsset(assetId, linkType);
      if (success) {
        onSuccess?.();
        onClose();
      } else {
        setError('关联失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '关联失败');
    } finally {
      setIsLinking(false);
    }
  }, [selectedNodeId, assetId, linkType, linkAsset, onSuccess, onClose]);
  return createPortal(
    <div
      data-testid="link-asset-dialog"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">关联资产到节点</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
        {assetName && (
          <div className="mb-4 rounded bg-gray-50 px-3 py-2 text-sm text-gray-600">
            资产: <span className="font-medium text-gray-900">{assetName}</span>
          </div>
        )}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            data-testid="node-selector"
            type="text"
            placeholder="搜索节点..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="mb-4 max-h-48 overflow-y-auto rounded border">
          {filteredNodes.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              {searchTerm ? '没有匹配的节点' : '没有可关联的节点'}
            </div>
          ) : (
            filteredNodes.map((node) => (
              <button
                key={node.id}
                type="button"
                onClick={() => setSelectedNodeId(node.id)}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50',
                  selectedNodeId === node.id && 'bg-blue-50'
                )}
              >
                <span className="flex-1 truncate">{node.label}</span>
                <Badge variant={node.type === NodeType.TASK ? 'default' : 'secondary'}>
                  {node.type === NodeType.TASK ? '任务' : '数据'}
                </Badge>
              </button>
            ))
          )}
        </div>

        <div data-testid="link-type-radio" className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">关联类型</label>
          <div className="flex gap-2">
            {LINK_TYPE_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                variant={linkType === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLinkType(opt.value)}
                title={opt.description}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLinking}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedNodeId || isLinking}>
            {isLinking ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                关联中...
              </>
            ) : (
              <>
                <Link2 className="mr-1.5 h-4 w-4" />
                确认
              </>
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default LinkAssetDialog;
