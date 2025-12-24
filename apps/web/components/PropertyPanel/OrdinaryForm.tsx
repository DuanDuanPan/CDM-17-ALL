'use client';

/**
 * Story 2.1: Ordinary Node Form
 * Simple form for description-only nodes
 */

import { useState, useEffect } from 'react';

export interface OrdinaryFormProps {
  nodeId: string;
  initialData?: {
    description?: string;
  };
  onUpdate?: (data: { description?: string }) => void;
}

export function OrdinaryForm({ nodeId: _nodeId, initialData, onUpdate }: OrdinaryFormProps) {
  const [description, setDescription] = useState(initialData?.description || '');

  useEffect(() => {
    setDescription(initialData?.description || '');
  }, [initialData]);

  const handleChange = (value: string) => {
    setDescription(value);
    onUpdate?.({ description: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">描述</label>
        <textarea
          value={description}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="输入节点描述..."
          className="w-full min-h-[120px] text-sm border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
        />
      </div>
    </div>
  );
}
