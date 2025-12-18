import { CreateNodeDto, NodeProps, NodeResponse, NodeType } from '@cdm/types';

export async function fetchNode(nodeId: string): Promise<NodeResponse | null> {
  const response = await fetch(`/api/nodes/${nodeId}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch node: ${response.status}`);
  }
  return response.json();
}

export async function createNode(payload: CreateNodeDto): Promise<NodeResponse> {
  const response = await fetch('/api/nodes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to create node: ${response.status}`);
  }
  return response.json();
}

export async function updateNodeType(nodeId: string, type: NodeType): Promise<boolean> {
  const response = await fetch(`/api/nodes/${nodeId}/type`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  });
  return response.ok;
}

export async function updateNodeProps(nodeId: string, type: NodeType, props: NodeProps): Promise<boolean> {
  const response = await fetch(`/api/nodes/${nodeId}/properties`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, props }),
  });
  return response.ok;
}
