// Node types for the mindmap graph
export interface NodeData {
  id: string;
  label: string;
  type?: 'root' | 'topic' | 'subtopic';
  parentId?: string;
  collapsed?: boolean;
  metadata?: Record<string, unknown>;
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
