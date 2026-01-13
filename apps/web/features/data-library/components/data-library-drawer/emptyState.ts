import type { OrganizationView } from '../OrganizationTabs';

interface EmptyStateArgs {
  orgView: OrganizationView;
  /** Story 9.8: Active node ID for merged node view */
  activeNodeId?: string | null;
  // Legacy props - kept for backward compatibility
  selectedPbsId?: string | null;
  selectedTaskId?: string | null;
  selectedFolderId: string | null;
}

export function getDataLibraryEmptyStateMessage({
  orgView,
  activeNodeId,
  selectedPbsId,
  selectedTaskId,
  selectedFolderId,
}: EmptyStateArgs): string {
  // Story 9.8: Merged node view
  if (orgView === 'node') {
    const nodeId = activeNodeId ?? selectedPbsId ?? selectedTaskId;
    if (nodeId) {
      return '该节点没有关联的数据资产';
    }
    return '请选择一个节点查看关联资产';
  }
  if (orgView === 'folder' && selectedFolderId) {
    return '该文件夹为空';
  }
  return '暂无数据资产';
}
