import { CreateNodeDto, NodeProps, NodeResponse, NodeType, sanitizeNodeProps } from '@cdm/types';

/**
 * Sanitize props before sending to API
 * - Converts empty strings to null for nullable fields
 * - Removes undefined values
 */
function sanitizeProps(props: NodeProps, nodeType?: NodeType): NodeProps {
  const filtered = sanitizeNodeProps(nodeType ?? NodeType.ORDINARY, props as Record<string, unknown>);
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filtered)) {
    // Skip undefined values
    if (value === undefined) continue;

    // Convert empty strings to null for better API compatibility
    if (value === '') {
      sanitized[key] = null;
    } else {
      sanitized[key] = value;
    }
  }

  // Drop null for non-nullable array fields to satisfy API validation
  const type = nodeType ?? NodeType.ORDINARY;
  const nonNullableArrayKeysByType: Partial<Record<NodeType, readonly string[]>> = {
    [NodeType.APP]: ['inputs', 'outputs'],
    [NodeType.TASK]: ['knowledgeRefs'],
  };
  const arrayKeys = nonNullableArrayKeysByType[type];
  if (arrayKeys) {
    for (const key of arrayKeys) {
      if (sanitized[key] === null) {
        delete sanitized[key];
      }
    }
  }

  return sanitized as NodeProps;
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
export async function updateNode(
  nodeId: string,
  data: {
    label?: string;
    description?: string;
    type?: NodeType;
    props?: NodeProps;
    tags?: string[];
    isArchived?: boolean;
    x?: number;
    y?: number;
  }
): Promise<boolean> {
  const response = await fetch(`/api/nodes/${nodeId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return response.ok;
}

/**
 * Update node tags
 * PATCH /api/nodes/:id/tags
 */
export async function updateNodeTags(nodeId: string, tags: string[]): Promise<boolean> {
  const response = await fetch(`/api/nodes/${nodeId}/tags`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags }),
  });
  return response.ok;
}

/**
 * Archive node (soft delete)
 * POST /api/nodes/:id:archive
 */
export async function archiveNode(nodeId: string): Promise<boolean> {
  const response = await fetch(`/api/nodes/${nodeId}:archive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return response.ok;
}

/**
 * Unarchive node (restore)
 * POST /api/nodes/:id:unarchive
 */
export async function unarchiveNode(nodeId: string): Promise<boolean> {
  const response = await fetch(`/api/nodes/${nodeId}:unarchive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return response.ok;
}

export async function updateNodeProps(nodeId: string, type: NodeType, props: NodeProps): Promise<boolean> {
  const sanitizedProps = sanitizeProps(props, type);
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
