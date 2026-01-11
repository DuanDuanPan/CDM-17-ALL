import type { ColorMapType } from '../components/ColorBar';

type LutLike = {
  removeAllPoints: () => void;
  addRGBPoint: (x: number, r: number, g: number, b: number) => void;
};

const COLOR_MAP_CONFIGS: Record<ColorMapType, ReadonlyArray<[number, number, number, number]>> = {
  rainbow: [
    [0.0, 0.0, 0.0, 1.0], // Blue
    [0.25, 0.0, 1.0, 1.0], // Cyan
    [0.5, 0.0, 1.0, 0.0], // Green
    [0.75, 1.0, 1.0, 0.0], // Yellow
    [1.0, 1.0, 0.0, 0.0], // Red
  ],
  jet: [
    [0.0, 0.0, 0.0, 0.5],
    [0.15, 0.0, 0.0, 1.0],
    [0.35, 0.0, 1.0, 1.0],
    [0.65, 1.0, 1.0, 0.0],
    [0.85, 1.0, 0.0, 0.0],
    [1.0, 0.5, 0.0, 0.0],
  ],
  coolwarm: [
    [0.0, 0.23, 0.3, 0.75],
    [0.25, 0.46, 0.6, 0.92],
    [0.5, 0.87, 0.87, 0.87],
    [0.75, 0.91, 0.46, 0.38],
    [1.0, 0.71, 0.02, 0.15],
  ],
};

export function applyColorMap(lut: LutLike, map: ColorMapType, min: number, max: number) {
  const config = COLOR_MAP_CONFIGS[map] ?? COLOR_MAP_CONFIGS.rainbow;
  lut.removeAllPoints();
  const span = max - min || 1;
  for (const [pos, r, g, b] of config) {
    lut.addRGBPoint(min + pos * span, r, g, b);
  }
}

