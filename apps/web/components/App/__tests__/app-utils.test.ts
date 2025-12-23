import { describe, it, expect } from 'vitest';
import { buildLibraryDefaults } from '@/components/App/app-utils';
import type { AppLibraryEntry } from '@cdm/types';

describe('buildLibraryDefaults', () => {
  it('hydrates default inputs/outputs with generated ids and cleared values', () => {
    const entry: AppLibraryEntry = {
      id: 'app-001',
      name: 'Orbit Designer Pro',
      description: 'Test',
      category: '轨道设计',
      executionType: 'webapi',
      defaultInputs: [
        { key: 'Orbit Altitude', type: 'number', required: true },
        { key: 'Inclination', type: 'number', required: true },
      ],
      defaultOutputs: [
        { key: 'Trajectory File', type: 'file', mimeType: 'application/json' },
      ],
    };

    const { inputs, outputs } = buildLibraryDefaults(entry);

    expect(inputs).toHaveLength(2);
    expect(outputs).toHaveLength(1);
    expect(inputs[0].id).toBeTruthy();
    expect(inputs[0].value).toBeUndefined();
    expect(inputs[0].fileId).toBeUndefined();
    expect(inputs[0].fileName).toBeUndefined();
    expect(outputs[0].id).toBeTruthy();
    expect(outputs[0].value).toBeUndefined();
    expect(outputs[0].fileName).toBeUndefined();
    expect(outputs[0].generatedAt).toBeUndefined();
  });
});
