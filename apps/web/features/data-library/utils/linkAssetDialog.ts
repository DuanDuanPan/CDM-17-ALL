import { NodeType, type DataLinkType } from '@cdm/types';

export const LINK_TYPE_OPTIONS: { value: DataLinkType; label: string; description: string }[] =
  [
    { value: 'input', label: '输入 (Input)', description: '作为任务输入数据' },
    { value: 'reference', label: '参考 (Reference)', description: '作为参考资料' },
    { value: 'output', label: '输出 (Output)', description: '作为任务产出成果' },
  ];

export interface SelectableNode {
  id: string;
  label: string;
  type: NodeType.TASK | NodeType.DATA;
}

