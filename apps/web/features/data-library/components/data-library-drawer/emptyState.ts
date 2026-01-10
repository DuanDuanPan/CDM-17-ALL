import type { OrganizationView } from '../OrganizationTabs';

interface EmptyStateArgs {
  orgView: OrganizationView;
  selectedPbsId: string | null;
  selectedTaskId: string | null;
  selectedFolderId: string | null;
}

export function getDataLibraryEmptyStateMessage({
  orgView,
  selectedPbsId,
  selectedTaskId,
  selectedFolderId,
}: EmptyStateArgs): string {
  if (orgView === 'pbs' && selectedPbsId) {
    return '该 PBS 节点没有关联的数据资产';
  }
  if (orgView === 'task' && selectedTaskId) {
    return '该任务没有关联的数据资产';
  }
  if (orgView === 'folder' && selectedFolderId) {
    return '该文件夹为空';
  }
  return '暂无数据资产';
}

