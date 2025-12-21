// Node types for the mindmap graph
export interface NodeData {
  id: string;
  label: string;
  description?: string; // Story 2.2: Description for card UI
  type?: 'root' | 'topic' | 'subtopic';
  parentId?: string;
  collapsed?: boolean;
  order?: number; // Sibling order for stable layout/serialization
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  creator?: string;
}

// Layout mode type for the mindmap
export type LayoutMode = 'mindmap' | 'logic' | 'free' | 'network';

// Story 2.1: Import semantic node types for MindNodeData extension
import type { NodeType, NodeProps } from './node-types';

// Enhanced node data for MindNode component (supports editing)
// [AI-Review-2][MEDIUM-3] Extended with Story 2.1 fields (nodeType, props)
export interface MindNodeData extends NodeData {
  isEditing?: boolean;   // Whether node is in edit mode
  isSelected?: boolean;  // Whether node is selected
  description?: string;  // Explicitly add description
  x?: number;            // Node position X
  y?: number;            // Node position Y
  width?: number;        // Node width (auto-resize)
  height?: number;       // Node height (auto-resize)
  layoutMode?: LayoutMode; // Layout mode for the mindmap (default: 'mindmap')
  // Story 2.1: Semantic node type and properties
  nodeType?: NodeType;
  props?: NodeProps;
}

// Story 2.2: Import edge types for EdgeData extension
import type { EdgeKind, DependencyType } from './edge-types';

// Edge types for connections between nodes
// Story 2.2: Extended with EdgeKind and DependencyType support
export interface EdgeData {
  id: string;
  source: string;
  target: string;
  type?: 'hierarchical' | 'reference'; // Legacy field for backward compatibility
  // Story 2.2: Edge polymorphism support
  kind?: EdgeKind;           // 'hierarchical' | 'dependency'
  dependencyType?: DependencyType; // 'FS' | 'SS' | 'FF' | 'SF' (only when kind === 'dependency')
}

// Graph state representation
export interface GraphState {
  nodes: NodeData[];
  edges: EdgeData[];
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Story 2.1: Export semantic node types
export * from './node-types';

// Story 2.2: Export edge types for dependency management
export * from './edge-types';

// Story 2.4: Export notification types for task dispatch & feedback
export * from './notification-types';
