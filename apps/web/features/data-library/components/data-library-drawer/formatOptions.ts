import type { DataAssetFormat } from '@cdm/types';

export const DATA_ASSET_FORMAT_OPTIONS: { value: DataAssetFormat | ''; label: string }[] = [
  { value: '', label: '全部类型' },
  { value: 'STEP', label: 'STEP' },
  { value: 'IGES', label: 'IGES' },
  { value: 'STL', label: 'STL' },
  { value: 'PDF', label: 'PDF' },
  { value: 'DOCX', label: 'DOCX' },
  { value: 'XLSX', label: 'XLSX' },
  { value: 'JSON', label: 'JSON' },
  { value: 'CSV', label: 'CSV' },
  { value: 'IMAGE', label: '图片' },
  { value: 'VIDEO', label: '视频' },
  { value: 'OTHER', label: '其他' },
];

