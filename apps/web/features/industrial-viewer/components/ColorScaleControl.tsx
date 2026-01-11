'use client';

import * as React from 'react';
import { Input, Select, cn } from '@cdm/ui';
import type { ColorMapType } from './ColorBar';

export interface ColorScaleControlProps {
  colorMap: ColorMapType;
  onColorMapChange: (colorMap: ColorMapType) => void;
  minValue: number;
  maxValue: number;
  onRangeChange: (min: number, max: number) => void;
  disabled?: boolean;
  className?: string;
}

const COLOR_MAP_OPTIONS = [
  { value: 'rainbow', label: 'Rainbow' },
  { value: 'jet', label: 'Jet' },
  { value: 'coolwarm', label: 'Coolwarm' },
];

export function ColorScaleControl({
  colorMap,
  onColorMapChange,
  minValue,
  maxValue,
  onRangeChange,
  disabled = false,
  className,
}: ColorScaleControlProps) {
  const [localMin, setLocalMin] = React.useState(() => String(minValue));
  const [localMax, setLocalMax] = React.useState(() => String(maxValue));

  React.useEffect(() => {
    setLocalMin(String(minValue));
    setLocalMax(String(maxValue));
  }, [minValue, maxValue]);

  const commitRange = () => {
    const min = Number(localMin);
    const max = Number(localMax);
    if (Number.isFinite(min) && Number.isFinite(max) && min < max) onRangeChange(min, max);
    else {
      setLocalMin(String(minValue));
      setLocalMax(String(maxValue));
    }
  };

  return (
    <div
      className={cn('p-3 rounded-lg bg-black/40 backdrop-blur-md border border-gray-700 space-y-3', className)}
      data-testid="color-scale-control"
    >
      <div className="space-y-1">
        <label className="text-xs text-gray-400 block">色标</label>
        <Select
          options={COLOR_MAP_OPTIONS}
          value={colorMap}
          onChange={(val) => onColorMapChange(val as ColorMapType)}
          disabled={disabled}
          data-testid="colormap-select"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs text-gray-400 block">范围</label>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            onBlur={commitRange}
            disabled={disabled}
            className="w-20 h-8 text-xs bg-gray-800 border-gray-700 text-white"
            data-testid="scalar-min"
          />
          <span className="text-gray-500 text-xs">—</span>
          <Input
            type="number"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            onBlur={commitRange}
            disabled={disabled}
            className="w-20 h-8 text-xs bg-gray-800 border-gray-700 text-white"
            data-testid="scalar-max"
          />
        </div>
      </div>
    </div>
  );
}
