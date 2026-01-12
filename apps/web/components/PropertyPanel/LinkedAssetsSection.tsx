'use client';

import { useState } from 'react';
import { Database, Plus, Eye, Trash2, Loader2 } from 'lucide-react';
import { Badge, Button, useToast, cn } from '@cdm/ui';
import { useAssetLinks } from '@/features/data-library/hooks/useAssetLinks';
import { getAssetPreviewType } from '@/features/data-library/hooks/useAssetPreview';
import type { DataLinkType, NodeDataLinkWithAsset } from '@cdm/types';

export interface LinkedAssetsSectionProps {
  nodeId: string;
  onAddClick?: () => void;
  onPreview?: (link: NodeDataLinkWithAsset) => void;
}

const LINK_TYPE_CONFIG: Record<DataLinkType, { label: string; className: string }> = {
  input: { label: 'INPUT', className: 'bg-blue-100 text-blue-700' },
  output: { label: 'OUTPUT', className: 'bg-green-100 text-green-700' },
  reference: { label: 'REFERENCE', className: 'bg-gray-100 text-gray-700' },
};

export function LinkedAssetsSection({
  nodeId,
  onAddClick,
  onPreview,
}: LinkedAssetsSectionProps) {
  const { addToast } = useToast();
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const { links, isLoading, unlinkAsset } = useAssetLinks({
    nodeId,
    onUnlinkSuccess: () => {
      addToast({ type: 'success', title: '解除关联', description: '已解除资产关联' });
    },
    onError: (error) => {
      addToast({ type: 'error', title: '操作失败', description: error });
    },
  });

  const handleUnlink = async (link: NodeDataLinkWithAsset) => {
    setUnlinkingId(link.id);
    await unlinkAsset(link.assetId);
    setUnlinkingId(null);
  };

  const handlePreview = (link: NodeDataLinkWithAsset) => {
    const previewType = getAssetPreviewType(link.asset);
    if (previewType) {
      onPreview?.(link);
    } else {
      addToast({ type: 'warning', title: '无法预览', description: '该资产格式暂不支持预览' });
    }
  };

  const content = isLoading ? (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      加载中...
    </div>
  ) : links.length === 0 ? (
    <div className="py-2 text-sm text-gray-500">暂无关联资产</div>
  ) : (
    <div className="space-y-2">
      {links.map((link) => {
        const linkType = LINK_TYPE_CONFIG[link.linkType];
        return (
          <div
            key={link.id}
            className="group flex items-center gap-2 rounded-md bg-gray-50 p-2 hover:bg-gray-100"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-gray-800" title={link.asset.name}>
                {link.asset.name}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Badge variant="outline" className="px-1 py-0 text-xs">
                  {link.asset.format?.toUpperCase() || 'OTHER'}
                </Badge>
                <Badge
                  data-testid="link-type-badge"
                  className={cn('px-1 py-0 text-xs', linkType?.className)}
                >
                  {linkType?.label || link.linkType}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                type="button"
                data-testid="asset-preview-button"
                variant="ghost"
                size="icon"
                onClick={() => handlePreview(link)}
                className="h-8 w-8 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                title="预览"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                data-testid="asset-unlink-button"
                variant="ghost"
                size="icon"
                onClick={() => handleUnlink(link)}
                disabled={unlinkingId === link.id}
                className="h-8 w-8 text-gray-500 hover:bg-red-50 hover:text-red-600"
                title="解除关联"
              >
                {unlinkingId === link.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div data-testid="linked-assets-section" className="mt-6 border-t border-gray-200 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Database className="h-4 w-4" />
          关联资产
        </h3>
        {onAddClick ? (
          <Button
            type="button"
            onClick={onAddClick}
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-blue-600 hover:bg-blue-50"
          >
            <Plus className="h-3 w-3" />
            添加
          </Button>
        ) : null}
      </div>
      {content}
    </div>
  );
}

export default LinkedAssetsSection;
