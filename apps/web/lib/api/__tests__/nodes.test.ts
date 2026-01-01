import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NodeType, type NodeProps } from '@cdm/types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

import { updateNodeProps } from '../nodes';

describe('Nodes API', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('does not coerce empty string props to null (prevents Zod validation errors)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const props: NodeProps = {
      reqType: '功能需求',
      acceptanceCriteria: '',
      priority: 'must',
    };

    await updateNodeProps('node-1', NodeType.REQUIREMENT, props);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/nodes/node-1/properties', expect.any(Object));

    const init = mockFetch.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(init.body as string) as { type: NodeType; props: Record<string, unknown> };

    expect(body.type).toBe(NodeType.REQUIREMENT);
    expect(body.props.acceptanceCriteria).not.toBeNull();
  });
});

