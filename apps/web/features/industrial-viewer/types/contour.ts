import type { ColorMapType } from '../components/ColorBar';

export interface UseContourViewerOptions {
  dataUrl: string;
  colorMap?: ColorMapType;
  initialMin?: number;
  initialMax?: number;
}

export interface UseContourViewerResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isLoading: boolean;
  error: Error | null;
  colorMap: ColorMapType;
  setColorMap: (colorMap: ColorMapType) => void;
  range: { min: number; max: number };
  setRange: (min: number, max: number) => void;
  scalarName: string | null;
  unit: string | null;
}

export type VtkRefs = {
  fullScreenRenderer?: { delete: () => void; getRenderer: () => unknown; getRenderWindow: () => unknown };
  renderer?: { addActor: (actor: unknown) => void; resetCamera: () => void };
  renderWindow?: { render: () => void };
  mapper?: { setScalarRange: (min: number, max: number) => void };
  lut?: { removeAllPoints: () => void; addRGBPoint: (x: number, r: number, g: number, b: number) => void };
};

