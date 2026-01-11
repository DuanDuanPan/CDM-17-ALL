/**
 * Type declarations for online-3d-viewer
 * @see https://kovacsv.github.io/Online3DViewer/
 */
declare module 'online-3d-viewer' {
  // Geometry constants
  export const Direction: {
    X: 1;
    Y: 2;
    Z: 3;
  };

  // Shading types (auto-selected by model materials)
  export const ShadingType: {
    Phong: 1;
    Physical: 2;
  };

  // Color classes
  export class RGBColor {
    constructor(r: number, g: number, b: number);
    r: number;
    g: number;
    b: number;
    Clone(): RGBColor;
  }

  export class RGBAColor {
    constructor(r: number, g: number, b: number, a: number);
    r: number;
    g: number;
    b: number;
    a: number;
    Clone(): RGBAColor;
  }

  // Edge settings for wireframe rendering
  export class EdgeSettings {
    constructor(
      showEdges: boolean,
      edgeColor: RGBColor,
      edgeThreshold: number
    );
    showEdges: boolean;
    edgeColor: RGBColor;
    edgeThreshold: number;
    Clone(): EdgeSettings;
  }

  // Model node structure (for hierarchy tree)
  export interface ModelNode {
    GetName(): string;
    SetName(name: string): void;
    GetId(): number;
    HasParent(): boolean;
    GetParent(): ModelNode | null;
    GetChildNodes(): ModelNode[];
    ChildNodeCount(): number;
    GetChildNode(index: number): ModelNode;
    MeshIndexCount(): number;
    GetMeshIndex(index: number): number;
    GetMeshIndices(): number[];
    IsEmpty(): boolean;
    IsMeshNode(): boolean;
    Enumerate(processor: (node: ModelNode) => void): void;
    EnumerateChildren(processor: (node: ModelNode) => void): void;
    EnumerateMeshIndices(processor: (meshIndex: number) => void): void;
  }

  // Mesh interface
  export interface Mesh {
    GetName(): string;
    GetId(): number;
    GetMaterial(): Material | null;
  }

  // Material interface
  export interface Material {
    name: string;
    color: RGBColor;
  }

  // Loaded model
  export interface Model {
    GetRootNode(): ModelNode;
    GetNodeById(id: number): ModelNode | null;
    GetMeshCount(): number;
    EnumerateMeshInstances(
      callback: (meshInstance: MeshInstance) => void
    ): void;
  }

  // Mesh instance
  export interface MeshInstance {
    GetId(): number;
    GetMesh(): Mesh;
    GetNode(): ModelNode;
  }

  // Camera modes
  export enum CameraMode {
    Perspective = 0,
    Orthographic = 1,
  }

  // Viewer settings
  export interface EmbeddedViewerSettings {
    backgroundColor?: RGBAColor;
    defaultColor?: RGBColor;
    defaultLineColor?: RGBColor;
    edgeSettings?: EdgeSettings;
    cameraMode?: CameraMode;
    environmentSettings?: unknown;
    camera?: unknown;
    projectionMode?: unknown;
    /** Callback when model is fully loaded with all textures */
    onModelLoaded?: () => void;
    /** Callback when model loading fails */
    onModelLoadFailed?: () => void;
  }

  // Navigation interface
  export interface Navigation {
    FitSphereToWindow(
      sphere: { center: { x: number; y: number; z: number }; radius: number },
      withAnimation: boolean
    ): void;
    MoveCamera(
      eye: { x: number; y: number; z: number },
      center: { x: number; y: number; z: number },
      up: { x: number; y: number; z: number },
      withAnimation: boolean
    ): void;
  }

  // Inner Viewer interface (accessed via EmbeddedViewer.GetViewer())
  export interface ViewerInterface {
    FitSphereToWindow(
      boundingSphere: { center: { x: number; y: number; z: number }; radius: number },
      withAnimation: boolean
    ): void;
    GetBoundingSphere(
      filter: (meshUserData: unknown) => boolean
    ): { center: { x: number; y: number; z: number }; radius: number } | null;
    GetShadingType(): number;
    SetEdgeSettings(edgeSettings: EdgeSettings): void;
    SetUpVector(upDirection: number, animate: boolean): void;
    AdjustClippingPlanesToSphere(
      boundingSphere: { center: { x: number; y: number; z: number }; radius: number } | null
    ): void;
    SetMeshesHighlight(
      highlightColor: RGBColor,
      isHighlighted: (meshUserData: unknown) => boolean
    ): void;
    Resize(): void;
    Render(): void;
  }

  // Load callbacks
  export interface LoadCallbacks {
    onModelLoaded?: () => void;
    onLoadError?: (error: unknown) => void;
    onLoadStart?: () => void;
    onLoadProgress?: (progress: number) => void;
  }

  // EmbeddedViewer class
  export class EmbeddedViewer {
    constructor(
      parentElement: HTMLElement,
      settings?: EmbeddedViewerSettings
    );

    /** Load model from URL list. Callbacks should be passed to constructor, not here. */
    LoadModelFromUrlList(urls: string[]): void;
    /** Load model from File list. Callbacks should be passed to constructor, not here. */
    LoadModelFromFileList(files: File[]): void;

    GetViewer(): ViewerInterface;
    GetModel(): Model | null;

    Resize(): void;
    Destroy(): void;
  }

  // Utility functions
  export function SetExternalLibLocation(location: string): void;
  export function GetDefaultCamera(direction: number): unknown;
}
