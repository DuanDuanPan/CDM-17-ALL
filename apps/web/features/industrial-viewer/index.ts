// Industrial Viewer Module
// 3D Model and Contour preview for STEP/IGES/glTF/VTK formats

// Hooks
export {
  useOnline3DViewer,
  type UseOnline3DViewerOptions,
  type UseOnline3DViewerResult,
  type RenderMode,
} from './hooks/useOnline3DViewer';
export { useViewerEnhancement, type UseViewerEnhancementResult } from './hooks/useViewerEnhancement';
export { useContourViewer } from './hooks/useContourViewer';
export type { UseContourViewerOptions, UseContourViewerResult } from './types/contour';

// Model Viewer Components
export { ModelViewer, type ModelViewerProps, type ModelViewerControls } from './components/ModelViewer';
export { ModelViewerModal, type ModelViewerModalProps } from './components/ModelViewerModal';
export { ViewerToolbar, type ViewerToolbarProps } from './components/ViewerToolbar';
export { ModelStructureTree, type ModelStructureTreeProps } from './components/ModelStructureTree';

// Contour Viewer Components (Story 9.4)
export { ContourViewer, type ContourViewerProps, type ContourViewerControls } from './components/ContourViewer';
export { ContourViewerModal, type ContourViewerModalProps } from './components/ContourViewerModal';
export { ColorBar, type ColorBarProps, type ColorMapType } from './components/ColorBar';
export { ColorScaleControl, type ColorScaleControlProps } from './components/ColorScaleControl';
