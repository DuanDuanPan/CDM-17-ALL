// Node types for the mindmap graph
export interface NodeData {
  id: string;
  label: string;
  type?: 'root' | 'topic' | 'subtopic';
  parentId?: string;
  collapsed?: boolean;
  metadata?: Record<string, unknown>;
}

// Enhanced node data for MindNode component (supports editing)
export interface MindNodeData extends NodeData {
  isEditing?: boolean;   // Whether node is in edit mode
  isSelected?: boolean;  // Whether node is selected
  x?: number;            // Node position X
  y?: number;            // Node position Y
  width?: number;        // Node width (auto-resize)
  height?: number;       // Node height (auto-resize)
}

// Edge types for connections between nodes
export interface EdgeData {
  id: string;
  source: string;
  target: string;
  type?: 'hierarchical' | 'reference';
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
