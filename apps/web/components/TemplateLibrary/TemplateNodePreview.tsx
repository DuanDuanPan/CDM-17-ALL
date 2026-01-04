'use client';

/**
 * Shared Template Node Preview Component
 * Renders template structure as a tree.
 */

export interface TemplateNodePreviewProps {
  node: {
    label: string;
    type?: string;
    children?: TemplateNodePreviewProps['node'][];
  };
  depth: number;
}

export function TemplateNodePreview({ node, depth }: TemplateNodePreviewProps) {
  return (
    <div className={`${depth > 0 ? 'ml-4 border-l border-gray-200 pl-3' : ''}`}>
      <div className="flex items-center gap-2 py-1">
        <span className={`w-2 h-2 rounded-full ${getNodeTypeColor(node.type)}`} />
        <span className="text-sm text-gray-700">{node.label}</span>
        {node.type && (
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">
            {getNodeTypeLabel(node.type)}
          </span>
        )}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="mt-1">
          {node.children.map((child, index) => (
            <TemplateNodePreview key={index} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function getNodeTypeColor(type?: string): string {
  switch (type) {
    case 'TASK':
      return 'bg-green-500';
    case 'REQUIREMENT':
      return 'bg-purple-500';
    case 'PBS':
      return 'bg-blue-500';
    case 'DATA':
      return 'bg-yellow-500';
    case 'APP':
      return 'bg-cyan-500';
    default:
      return 'bg-gray-400';
  }
}

function getNodeTypeLabel(type?: string): string {
  switch (type) {
    case 'TASK':
      return '任务';
    case 'REQUIREMENT':
      return '需求';
    case 'PBS':
      return '产品';
    case 'DATA':
      return '数据';
    case 'APP':
      return '应用';
    default:
      return '普通';
  }
}

