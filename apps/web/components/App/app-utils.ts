import { nanoid } from 'nanoid';
import type { AppInput, AppOutput, AppLibraryEntry } from '@cdm/types';

export interface AppLibraryDefaults {
  inputs: AppInput[];
  outputs: AppOutput[];
}

export function buildLibraryDefaults(entry: AppLibraryEntry): AppLibraryDefaults {
  const inputs: AppInput[] = entry.defaultInputs.map((input) => ({
    ...input,
    id: nanoid(8),
    value: undefined,
    fileId: undefined,
    fileName: undefined,
  }));

  const outputs: AppOutput[] = entry.defaultOutputs.map((output) => ({
    ...output,
    id: nanoid(8),
    value: undefined,
    fileName: undefined,
    generatedAt: undefined,
  }));

  return { inputs, outputs };
}
