import { CreateNodeDto, NodeProps, NodeResponse, NodeType } from '@cdm/types';

/**
 * Sanitize props before sending to API
 * - Converts empty strings to null for nullable fields
 * - Removes undefined values
 */
function sanitizeProps(props: NodeProps): NodeProps {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(props)) {
    // Skip undefined values
    if (value === undefined) continue;

    // Convert empty strings to null for better API compatibility
    if (value === '') {
      sanitized[key] = null;
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

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

/**
 * Update node basic data (label, type, props, position)
 * PATCH /api/nodes/:id
 */
export async function updateNode(nodeId: string, data: { label?: string; type?: NodeType; props?: NodeProps; x?: number; y?: number }): Promise<boolean> {
  const response = await fetch(`/api/nodes/${nodeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.ok;
}

export async function updateNodeProps(nodeId: string, type: NodeType, props: NodeProps): Promise<boolean> {
  const sanitizedProps = sanitizeProps(props);
  const payload = { type, props: sanitizedProps };
  const response = await fetch(`/api/nodes/${nodeId}/properties`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // Log detailed error information for debugging
    const errorText = await response.text();
    let errorDetails;
    try {
      errorDetails = JSON.parse(errorText);
    } catch {
      errorDetails = errorText;
    }

    // Log with JSON.stringify to prevent object collapse in console
    console.error('[updateNodeProps] Validation failed:');
    console.error('  Node ID:', nodeId);
    console.error('  Type:', type);
    console.error('  Props:', JSON.stringify(props, null, 2));
    console.error('  Payload:', JSON.stringify(payload, null, 2));
    console.error('  Status:', response.status);
    console.error('  Error:', JSON.stringify(errorDetails, null, 2));
  }

  return response.ok;
}
