# Story 2.6: Multi-Select & Clipboard (多选与剪贴板)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Validated: 2025-12-22 - All critical issues addressed -->

## Story

**As a** User,
**I want** to select multiple nodes and perform copy, cut, and paste operations,
**so that** I can effectively restructure the mind map or migrate data between different canvases.

## Acceptance Criteria

### 1. Multi-Select Interaction
- **AC1.1 (Shift+Click):** Given I have a node selected, When I hold `Shift` and click another node, Then both nodes should be selected.
- **AC1.2 (Rubberband):** When I drag the mouse on the canvas background, Then a selection box (rubberband) should appear.
- **AC1.3 (Selection State):** When I release the mouse, Then all nodes intersecting the box should be selected (intersect mode, not strict contain).
- **AC1.4 (Visual Feedback):** Selected nodes must have a distinct visual style (e.g., blue border, selection box) to distinguish them from unselected nodes.

### 2. Copy (Cmd+C)
- **AC2.1:** When I press `Cmd+C` (Mac) or `Ctrl+C` (Windows) with nodes selected, Then the node data structure should be copied to the system clipboard.
- **AC2.2 (Scope):** Copy copies **only explicitly selected nodes**. Edges between selected nodes are included. Children not selected are NOT automatically copied.
- **AC2.3 (Serialization):** The clipboard content should be a JSON string containing the nodes, internal edges, and relative layout info with format version.

### 3. Paste (Cmd+V)
- **AC3.1:** When I press `Cmd+V`, Then the content from clipboard should be parsed and validated.
- **AC3.2 (ID Regeneration):** Every pasted node MUST have a new unique ID generated to avoid conflicts.
- **AC3.3 (Relative Structure):** The parent-child relationships and spatial layout (relative positions) between pasted nodes must be preserved.
- **AC3.4 (Positioning):** Paste via keyboard → center on viewport. Paste via context menu → use click position.
- **AC3.5 (Cross-Graph):** I can copy nodes from Graph A and paste into Graph B (requires graph access permission check).

### 4. Cut (Cmd+X)
- **AC4.1:** When I press `Cmd+X`, Then the behavior is equivalent to Copy followed by Delete.
- **AC4.2 (Undo Support):** Cut operation must be undoable (restore deleted nodes via Yjs UndoManager).

---

## Tasks / Subtasks

### Task 1: Type Definitions 📦

- [ ] **1.1** Create `packages/types/src/clipboard-types.ts`:
  ```typescript
  export interface ClipboardData {
    version: string; // "1.0" - for future migration support
    source: "cdm-17";
    timestamp: number; // Date.now() when copied
    sourceGraphId: string;
    nodes: ClipboardNodeData[];
    edges: ClipboardEdgeData[];
    layout: {
      minX: number;
      minY: number;
      width: number;
      height: number;
      center: { x: number; y: number };
    };
  }
  
  export interface ClipboardNodeData {
    originalId: string; // For reference, NOT used as ID when pasting
    label: string;
    type: NodeType;
    x: number; // Relative to layout.center
    y: number;
    width: number;
    height: number;
    parentOriginalId?: string; // To reconstruct hierarchy
    metadata: Record<string, unknown>;
    tags?: string[];
  }
  
  export interface ClipboardEdgeData {
    sourceOriginalId: string;
    targetOriginalId: string;
    type: EdgeType;
    label?: string;
  }
  ```

- [ ] **1.2** Create Zod Schema in `packages/types/src/schemas/clipboard.schema.ts`:
  ```typescript
  import { z } from 'zod';
  import { NodeType, EdgeType } from '../node-types';
  
  export const ClipboardDataSchema = z.object({
    version: z.string(),
    source: z.literal('cdm-17'),
    timestamp: z.number(),
    sourceGraphId: z.string(),
    nodes: z.array(z.object({
      originalId: z.string(),
      label: z.string(),
      type: z.nativeEnum(NodeType),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
      parentOriginalId: z.string().optional(),
      metadata: z.record(z.unknown()),
      tags: z.array(z.string()).optional(),
    })),
    edges: z.array(z.object({
      sourceOriginalId: z.string(),
      targetOriginalId: z.string(),
      type: z.nativeEnum(EdgeType),
      label: z.string().optional(),
    })),
    layout: z.object({
      minX: z.number(),
      minY: z.number(),
      width: z.number(),
      height: z.number(),
      center: z.object({ x: z.number(), y: z.number() }),
    }),
  });
  ```

- [ ] **1.3** Export from `packages/types/src/index.ts`.

### Task 2: X6 Selection Plugin Configuration 🎨

- [ ] **2.1** Update `apps/web/components/editor/GraphComponent.tsx`:
  - Configure X6 Selection plugin:
    ```typescript
    import { Selection } from '@antv/x6-plugin-selection';
    
    // In graph initialization
    graph.use(
      new Selection({
        enabled: true,
        multiple: true,           // AC1.1: Allow multi-select
        rubberband: true,         // AC1.2: Enable rubberband
        rubberbandModifiers: [],  // No modifier needed for rubberband
        strict: false,            // AC1.3: Intersect mode (not strict contain)
        movable: true,            // Allow moving selected group
        showNodeSelectionBox: true, // AC1.4: Visual feedback
        pointerEvents: 'none',
        filter: (cell) => cell.isNode(), // Only select nodes, not edges
      })
    );
    ```

- [ ] **2.2** Add selection event listeners:
  ```typescript
  graph.on('selection:changed', ({ added, removed, selected }) => {
    // Update global selection state
    setSelectedNodeIds(selected.filter(c => c.isNode()).map(c => c.id));
    // Emit event for toolbar state update
    eventBus.emit('selection:changed', { count: selected.length });
  });
  ```

- [ ] **2.3** Add Shift+Click multi-select support:
  ```typescript
  graph.on('cell:click', ({ cell, e }) => {
    if (e.shiftKey && cell.isNode()) {
      // AC1.1: Add to selection instead of replacing
      graph.select([...graph.getSelectedCells(), cell]);
    }
  });
  ```

### Task 3: useSelection Hook 🪝

- [ ] **3.1** Create `apps/web/hooks/useSelection.ts`:
  ```typescript
  'use client';
  
  import { useState, useCallback, useEffect } from 'react';
  import { Cell, Node } from '@antv/x6';
  import { useGraph } from './useGraph';
  import { eventBus } from '@/lib/event-bus';
  
  export interface UseSelectionReturn {
    selectedNodes: Node[];
    selectedNodeIds: string[];
    selectionCount: number;
    hasSelection: boolean;
    selectAll: () => void;
    clearSelection: () => void;
    selectNodes: (nodeIds: string[]) => void;
    addToSelection: (nodeId: string) => void;
    removeFromSelection: (nodeId: string) => void;
  }
  
  export function useSelection(): UseSelectionReturn {
    const { graph } = useGraph();
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
    
    useEffect(() => {
      if (!graph) return;
      
      const handleSelectionChanged = ({ selected }: { selected: Cell[] }) => {
        const nodeIds = selected
          .filter(cell => cell.isNode())
          .map(cell => cell.id);
        setSelectedNodeIds(nodeIds);
      };
      
      graph.on('selection:changed', handleSelectionChanged);
      return () => graph.off('selection:changed', handleSelectionChanged);
    }, [graph]);
    
    const selectAll = useCallback(() => {
      if (!graph) return;
      const allNodes = graph.getNodes();
      graph.select(allNodes);
    }, [graph]);
    
    const clearSelection = useCallback(() => {
      if (!graph) return;
      graph.unselect(graph.getSelectedCells());
    }, [graph]);
    
    const selectNodes = useCallback((nodeIds: string[]) => {
      if (!graph) return;
      const nodes = nodeIds
        .map(id => graph.getCellById(id))
        .filter((cell): cell is Node => cell?.isNode() ?? false);
      graph.select(nodes);
    }, [graph]);
    
    const addToSelection = useCallback((nodeId: string) => {
      if (!graph) return;
      const cell = graph.getCellById(nodeId);
      if (cell?.isNode()) {
        graph.select([...graph.getSelectedCells(), cell]);
      }
    }, [graph]);
    
    const removeFromSelection = useCallback((nodeId: string) => {
      if (!graph) return;
      const cell = graph.getCellById(nodeId);
      if (cell) {
        graph.unselect(cell);
      }
    }, [graph]);
    
    const selectedNodes = graph
      ? selectedNodeIds
          .map(id => graph.getCellById(id))
          .filter((cell): cell is Node => cell?.isNode() ?? false)
      : [];
    
    return {
      selectedNodes,
      selectedNodeIds,
      selectionCount: selectedNodeIds.length,
      hasSelection: selectedNodeIds.length > 0,
      selectAll,
      clearSelection,
      selectNodes,
      addToSelection,
      removeFromSelection,
    };
  }
  ```

### Task 4: useClipboard Hook 📋

- [ ] **4.1** Create `apps/web/hooks/useClipboard.ts`:
  ```typescript
  'use client';
  
  import { useCallback } from 'react';
  import { Node, Edge } from '@antv/x6';
  import { nanoid } from 'nanoid';
  import { useGraph } from './useGraph';
  import { useGraphContext } from './useGraphContext';
  import { useSelection } from './useSelection';
  import { useYjsDoc } from './useCollaboration';
  import { toast } from 'sonner';
  import type { ClipboardData, ClipboardNodeData, ClipboardEdgeData } from '@cdm/types';
  import { ClipboardDataSchema } from '@cdm/types/schemas';
  
  export interface UseClipboardReturn {
    copy: () => Promise<void>;
    cut: () => Promise<void>;
    paste: (position?: { x: number; y: number }) => Promise<void>;
    canPaste: () => Promise<boolean>;
  }
  
  export function useClipboard(): UseClipboardReturn {
    const { graph } = useGraph();
    const { graphId } = useGraphContext();
    const { selectedNodes, clearSelection, selectNodes } = useSelection();
    const { ydoc, undoManager } = useYjsDoc();
    
    /**
     * Serialize selected nodes to clipboard format
     */
    const serializeSelection = useCallback((): ClipboardData | null => {
      if (!graph || selectedNodes.length === 0) return null;
      
      const selectedIds = new Set(selectedNodes.map(n => n.id));
      
      // Calculate bounding box
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      selectedNodes.forEach(node => {
        const { x, y } = node.getPosition();
        const { width, height } = node.getSize();
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      });
      
      const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
      
      // Serialize nodes (relative to center)
      const nodes: ClipboardNodeData[] = selectedNodes.map(node => {
        const { x, y } = node.getPosition();
        const { width, height } = node.getSize();
        const data = node.getData() || {};
        
        return {
          originalId: node.id,
          label: data.label || node.getAttrByPath('text/text') || '',
          type: data.type || 'ORDINARY',
          x: x - center.x,
          y: y - center.y,
          width,
          height,
          parentOriginalId: data.parentId,
          metadata: data.metadata || {},
          tags: data.tags || [],
        };
      });
      
      // Serialize edges between selected nodes only (AC2.2)
      const allEdges = graph.getEdges();
      const edges: ClipboardEdgeData[] = allEdges
        .filter(edge => {
          const sourceId = edge.getSourceCellId();
          const targetId = edge.getTargetCellId();
          return selectedIds.has(sourceId) && selectedIds.has(targetId);
        })
        .map(edge => ({
          sourceOriginalId: edge.getSourceCellId(),
          targetOriginalId: edge.getTargetCellId(),
          type: edge.getData()?.type || 'HIERARCHY',
          label: edge.getLabels()?.[0]?.attrs?.label?.text,
        }));
      
      return {
        version: '1.0',
        source: 'cdm-17',
        timestamp: Date.now(),
        sourceGraphId: graphId,
        nodes,
        edges,
        layout: {
          minX,
          minY,
          width: maxX - minX,
          height: maxY - minY,
          center,
        },
      };
    }, [graph, selectedNodes, graphId]);
    
    /**
     * Copy selected nodes to system clipboard
     */
    const copy = useCallback(async () => {
      const data = serializeSelection();
      if (!data) {
        toast.warning('没有选中任何节点');
        return;
      }
      
      try {
        const jsonStr = JSON.stringify(data);
        await navigator.clipboard.writeText(jsonStr);
        toast.success(`已复制 ${data.nodes.length} 个节点`);
      } catch (err) {
        // Fallback for older browsers or permission denied
        console.error('Clipboard write failed:', err);
        toast.error('复制失败，请检查剪贴板权限');
      }
    }, [serializeSelection]);
    
    /**
     * Cut = Copy + Delete (with undo support)
     */
    const cut = useCallback(async () => {
      if (!graph || !ydoc) return;
      
      const data = serializeSelection();
      if (!data) {
        toast.warning('没有选中任何节点');
        return;
      }
      
      try {
        // Copy first
        await navigator.clipboard.writeText(JSON.stringify(data));
        
        // Delete via Yjs (AC4.2: Undoable)
        undoManager?.stopCapturing();
        const yNodes = ydoc.getMap('nodes');
        const yEdges = ydoc.getMap('edges');
        
        ydoc.transact(() => {
          selectedNodes.forEach(node => {
            yNodes.delete(node.id);
          });
          // Also delete edges
          data.edges.forEach(edge => {
            const edgeId = `${edge.sourceOriginalId}-${edge.targetOriginalId}`;
            yEdges.delete(edgeId);
          });
        });
        
        // Remove from X6 graph
        graph.removeCells(selectedNodes);
        
        toast.success(`已剪切 ${data.nodes.length} 个节点`);
      } catch (err) {
        console.error('Cut failed:', err);
        toast.error('剪切失败');
      }
    }, [graph, ydoc, undoManager, selectedNodes, serializeSelection]);
    
    /**
     * Paste from clipboard
     */
    const paste = useCallback(async (position?: { x: number; y: number }) => {
      if (!graph || !ydoc) return;
      
      try {
        const text = await navigator.clipboard.readText();
        let data: ClipboardData;
        
        try {
          const parsed = JSON.parse(text);
          // Validate format
          data = ClipboardDataSchema.parse(parsed);
        } catch {
          toast.warning('剪贴板内容不是有效的节点数据');
          return;
        }
        
        // Determine paste position (AC3.4)
        const pasteCenter = position ?? {
          x: graph.getGraphArea().center.x,
          y: graph.getGraphArea().center.y,
        };
        
        // Create ID mapping for new nodes (AC3.2)
        const idMap = new Map<string, string>();
        data.nodes.forEach(node => {
          idMap.set(node.originalId, nanoid());
        });
        
        // Start Yjs transaction for batch update
        undoManager?.stopCapturing();
        const yNodes = ydoc.getMap('nodes');
        const yEdges = ydoc.getMap('edges');
        
        const newNodeIds: string[] = [];
        
        ydoc.transact(() => {
          // Create nodes with new IDs (AC3.3: preserve relative positions)
          data.nodes.forEach(nodeData => {
            const newId = idMap.get(nodeData.originalId)!;
            newNodeIds.push(newId);
            
            // Map parent ID if exists
            const newParentId = nodeData.parentOriginalId 
              ? idMap.get(nodeData.parentOriginalId) 
              : undefined;
            
            const newNode = {
              id: newId,
              label: nodeData.label,
              type: nodeData.type,
              x: nodeData.x + pasteCenter.x,
              y: nodeData.y + pasteCenter.y,
              width: nodeData.width,
              height: nodeData.height,
              parentId: newParentId,
              metadata: nodeData.metadata,
              tags: nodeData.tags || [],
              graphId: graphId, // Use current graph, not source graph
            };
            
            yNodes.set(newId, newNode);
          });
          
          // Create edges with mapped IDs
          data.edges.forEach(edgeData => {
            const newSourceId = idMap.get(edgeData.sourceOriginalId);
            const newTargetId = idMap.get(edgeData.targetOriginalId);
            
            if (newSourceId && newTargetId) {
              const edgeId = nanoid();
              yEdges.set(edgeId, {
                id: edgeId,
                source: newSourceId,
                target: newTargetId,
                type: edgeData.type,
                label: edgeData.label,
              });
            }
          });
        });
        
        // Wait for Yjs sync to update X6 graph, then select new nodes
        setTimeout(() => {
          selectNodes(newNodeIds);
          // Center view on pasted content
          graph.centerCell(graph.getCellById(newNodeIds[0]));
        }, 100);
        
        toast.success(`已粘贴 ${data.nodes.length} 个节点`);
        
      } catch (err) {
        console.error('Paste failed:', err);
        if ((err as Error).name === 'NotAllowedError') {
          toast.error('请允许访问剪贴板');
        } else {
          toast.error('粘贴失败');
        }
      }
    }, [graph, ydoc, graphId, undoManager, selectNodes]);
    
    /**
     * Check if clipboard has valid paste data
     */
    const canPaste = useCallback(async (): Promise<boolean> => {
      try {
        const text = await navigator.clipboard.readText();
        const parsed = JSON.parse(text);
        ClipboardDataSchema.parse(parsed);
        return true;
      } catch {
        return false;
      }
    }, []);
    
    return { copy, cut, paste, canPaste };
  }
  ```

### Task 5: Keyboard Shortcut Integration ⌨️

- [ ] **5.1** Create `apps/web/hooks/useClipboardShortcuts.ts`:
  ```typescript
  'use client';
  
  import { useEffect, useCallback } from 'react';
  import { useClipboard } from './useClipboard';
  import { useSelection } from './useSelection';
  import { useEditingState } from './useEditingState';
  
  /**
   * Register Cmd+C, Cmd+X, Cmd+V shortcuts
   * IMPORTANT: Must not interfere with text editing in node labels
   */
  export function useClipboardShortcuts() {
    const { copy, cut, paste } = useClipboard();
    const { hasSelection } = useSelection();
    const { isEditing } = useEditingState(); // True when editing node label
    
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      // Skip if editing text (let browser handle text clipboard)
      if (isEditing) return;
      
      // Skip if focus is in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      if (!modifier) return;
      
      switch (e.key.toLowerCase()) {
        case 'c':
          if (hasSelection) {
            e.preventDefault();
            copy();
          }
          break;
        case 'x':
          if (hasSelection) {
            e.preventDefault();
            cut();
          }
          break;
        case 'v':
          e.preventDefault();
          paste();
          break;
      }
    }, [copy, cut, paste, hasSelection, isEditing]);
    
    useEffect(() => {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
  }
  ```

- [ ] **5.2** Create `apps/web/hooks/useEditingState.ts` (if not exists):
  ```typescript
  'use client';
  
  import { useState, useEffect } from 'react';
  import { useGraph } from './useGraph';
  
  export function useEditingState() {
    const { graph } = useGraph();
    const [isEditing, setIsEditing] = useState(false);
    
    useEffect(() => {
      if (!graph) return;
      
      // X6 emits 'cell:editing' events when user enters edit mode
      graph.on('node:editing', () => setIsEditing(true));
      graph.on('node:edited', () => setIsEditing(false));
      
      return () => {
        graph.off('node:editing', () => setIsEditing(true));
        graph.off('node:edited', () => setIsEditing(false));
      };
    }, [graph]);
    
    return { isEditing };
  }
  ```

- [ ] **5.3** Integrate shortcuts in `apps/web/components/editor/GraphComponent.tsx`:
  ```typescript
  import { useClipboardShortcuts } from '@/hooks/useClipboardShortcuts';
  
  export function GraphComponent() {
    // ... existing code
    useClipboardShortcuts();
    // ...
  }
  ```

### Task 6: UI Feedback & Toolbar Integration 🎯

- [ ] **6.1** Add toolbar buttons for Copy/Cut/Paste in `apps/web/components/editor/Toolbar.tsx`:
  ```typescript
  import { Copy, Scissors, ClipboardPaste } from 'lucide-react';
  import { useClipboard } from '@/hooks/useClipboard';
  import { useSelection } from '@/hooks/useSelection';
  
  // In Toolbar component
  const { copy, cut, paste } = useClipboard();
  const { hasSelection } = useSelection();
  
  // Toolbar buttons
  <TooltipButton icon={Copy} onClick={copy} disabled={!hasSelection} tooltip="复制 (⌘C)" />
  <TooltipButton icon={Scissors} onClick={cut} disabled={!hasSelection} tooltip="剪切 (⌘X)" />
  <TooltipButton icon={ClipboardPaste} onClick={paste} tooltip="粘贴 (⌘V)" />
  ```

- [ ] **6.2** Add context menu items in `apps/web/components/editor/ContextMenu.tsx`:
  ```typescript
  // Context menu items for selected nodes
  { label: '复制', icon: Copy, shortcut: '⌘C', action: copy, disabled: !hasSelection },
  { label: '剪切', icon: Scissors, shortcut: '⌘X', action: cut, disabled: !hasSelection },
  { label: '粘贴', icon: ClipboardPaste, shortcut: '⌘V', action: () => paste(contextMenuPosition) },
  ```

### Task 7: Cross-Graph Paste Validation (Backend) 🔒

- [ ] **7.1** Add permission check endpoint `apps/api/src/modules/graphs/graphs.controller.ts`:
  ```typescript
  /**
   * Check if user can paste to a graph
   * GET /api/graphs/:id/can-paste
   * Story 2.6 AC#3.5
   */
  @Get(':id/can-paste')
  async canPaste(
    @Param('id') graphId: string,
    @CurrentUser() user: UserContext
  ): Promise<{ canPaste: boolean; reason?: string }> {
    // Check if user has write access to this graph
    const hasAccess = await this.graphsService.checkWriteAccess(graphId, user.id);
    return {
      canPaste: hasAccess,
      reason: hasAccess ? undefined : '您没有此图谱的编辑权限',
    };
  }
  ```

- [ ] **7.2** Update paste logic to check permission for cross-graph paste:
  ```typescript
  // In useClipboard paste function
  if (data.sourceGraphId !== graphId) {
    // Cross-graph paste - verify permission
    const { canPaste: allowed, reason } = await apiClient.get(
      `/graphs/${graphId}/can-paste`
    );
    if (!allowed) {
      toast.error(reason || '无法粘贴到此图谱');
      return;
    }
  }
  ```

### Task 8: Testing Strategy 🧪

- [ ] **8.1** Unit Tests (`apps/web/__tests__/hooks/useClipboard.test.ts`):
  - Test serialization with various node configurations
  - Test ID regeneration produces unique IDs
  - Test relative position calculations
  - Test edge filtering (only edges between selected nodes)

- [ ] **8.2** Integration Tests (`apps/web/__tests__/integration/clipboard.test.ts`):
  - Test X6 Selection plugin behavior
  - Test Yjs sync after paste
  - Test undo after cut
  - Test multi-select with Shift+Click

- [ ] **8.3** E2E Tests (`apps/web/e2e/clipboard.spec.ts`):
  - Test copy multiple nodes, paste in same graph
  - Test cut nodes, verify deletion
  - Test cross-graph copy/paste
  - Test paste position (viewport center vs click position)
  - Test clipboard shortcuts don't interfere with text editing

---

## Dev Notes

### X6 Selection Plugin vs Custom Implementation
- Use X6's built-in `@antv/x6-plugin-selection` - it handles rubberband, multi-select, and visual feedback.
- Configure `strict: false` for intersect mode (more user-friendly).
- The plugin automatically provides visual selection boxes.

### Browser Clipboard API Limitations
- `navigator.clipboard` requires HTTPS or localhost.
- May require user permission prompt.
- Fallback to legacy `document.execCommand('copy')` is deprecated but works as fallback.

### Yjs Batch Update Pattern
- Always wrap paste operations in `ydoc.transact()` for atomic updates.
- Use `undoManager.stopCapturing()` before batch operations to group them as single undo action.
- Wait for Yjs sync before selecting newly pasted nodes (100ms delay).

### Keyboard Shortcut Conflict Resolution
- Skip clipboard shortcuts when `isEditing` is true (user editing node label).
- Skip when focus is on INPUT/TEXTAREA elements.
- Let browser handle native text selection clipboard in input fields.

### Performance for Large Selections
- Limit selection to 100 nodes for clipboard operations (toast warning if exceeded).
- Consider progress indicator for paste operations with >50 nodes.

---

## Detailed Design Specification

### 1. Data Flow (Yjs-First Pattern)

```
┌──────────────┐    ┌────────────────┐    ┌─────────────────┐
│  User Action │───>│ Yjs Transaction │───>│ Hocuspocus Sync │
│  (Cmd+V)     │    │ ydoc.transact() │    │    (Backend)    │
└──────────────┘    └────────────────┘    └─────────────────┘
                           │
                           v
                    ┌──────────────┐    ┌──────────────────┐
                    │  Yjs Update  │───>│ X6 Graph Update  │
                    │  Broadcast   │    │  (Auto via Hook) │
                    └──────────────┘    └──────────────────┘
```

### 2. Clipboard Data Validation

```typescript
// Paste validation flow
1. Read from navigator.clipboard.readText()
2. JSON.parse() - reject if invalid JSON
3. ClipboardDataSchema.parse() - reject if schema mismatch
4. Check data.source === 'cdm-17' - reject foreign data
5. Check data.version - apply migrations if needed (future)
6. For cross-graph: verify write permission
7. Execute paste with ID regeneration
```

#### 1.3 Database Migration Strategy

```bash
# Migration steps
1. Generate migration: pnpm db:migrate:dev --name add_tags_archive_to_node
2. Apply to development: pnpm db:push
3. Regenerate Prisma Client: pnpm db:generate
```

#### 1.4 UI/UX Design Specification (High-Fidelity) 🎨

> **Visual Reference:**
> ![Ui Mockup](/Users/enjoyjavapan163.com/.gemini/antigravity/brain/da5ed777-2da0-43ea-88eb-5108b28c0958/multi_select_clipboard_ui_v2_1766334700267.png)

**Design Tokens (Tailwind + CSS Variables):**
- **Accent Color:** `blue-500` (#3B82F6) / `primary`
- **Selection Blue:** `rgba(59, 130, 246, 0.1)` (Background)
- **Glass Panel:** `bg-popover/80 backdrop-blur-md border-border`

**A. Visual Selection State (Selected Node)**
- **Border:** `ring-2 ring-blue-500 ring-offset-2 ring-offset-background`
- **Shadow:** `shadow-lg shadow-blue-500/20`
- **Transition:** `transition-all duration-200 ease-out`
- **Interaction:** When selected, the node scale should subtly pulse (`scale(1.02)`) on click.

**B. Rubberband Selection Box**
- **Container:** `absolute pointer-events-none z-50`
- **Style:**
  - `bg-blue-500/10` (Background)
  - `border border-blue-500/50` (Border)
  - `rounded-sm`
- **Animation:** Instant feedback (no lag), use `will-change: transform, width, height`.

**C. Context Menu (Right Click)**
- **Container:** `z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover/80 p-1 text-popover-foreground shadow-md backdrop-blur-md animate-in fade-in-80 zoom-in-95`
- **Item Base:** `relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none`
- **Item Hover:** `focus:bg-accent focus:text-accent-foreground`
- **Shortcut Label:** `ml-auto text-xs tracking-widest text-muted-foreground opacity-100`
- **Icons:** Use Lucide React icons (`w-4 h-4 mr-2`).

**D. Toolbar Integration**
- **Group:** Add a vertical separator `w-px h-6 bg-border mx-2` before the Clipboard group.
- **Button State:**
  - **Disabled:** `opacity-50 grayscale cursor-not-allowed` (When selection count = 0)
  - **Active:** `hover:bg-accent hover:text-accent-foreground`

**E. Motion Design**
- **Paste:** When pasting, new nodes should:
  - Start: `opacity-0 scale-90`
  - End: `opacity-100 scale-100`
  - Timing: `spring(stiffness: 300, damping: 25)`
  - Stagger: If pasting multiple, stagger by 50ms.

---

### 2. Program Logic Design (程序逻辑设计)State Management

```
┌─────────────────────────────────────────────────────────────────┐
│                       Selection State                            │
├─────────────────────────────────────────────────────────────────┤
│  Source: X6 Selection Plugin (single source of truth)          │
│  Sync:   useSelection hook listens to 'selection:changed'       │
│  UI:     Toolbar, ContextMenu read from useSelection            │
└─────────────────────────────────────────────────────────────────┘
```

  - End: `opacity-100 scale-100`
  - Timing: `spring(stiffness: 300, damping: 25)`
  - Stagger: If pasting multiple, stagger by 50ms.

---

### 3. Test Design Specification (试验设计) 🧪

#### 3.1 E2E Test Scenarios (Playwright)

**Scenario 1: Single Node Copy & Paste**
1.  **Given** Graph has one node "Node A".
2.  **When** User selects "Node A" and presses `Cmd+C`.
3.  **And** User moves cursor to empty space and presses `Cmd+V`.
4.  **Then** A new node "Node A" (copy) appears at cursor position.
5.  **And** The original "Node A" remains.
6.  **And** Toast message "Copied 1 node" and "Pasted 1 node" appear.

**Scenario 2: Multi-Select Rubberband**
1.  **Given** Graph has 3 nodes arranged triangle-like.
2.  **When** User drags mouse from top-left to bottom-right enclosing all 3 nodes.
3.  **Then** A rubberband box appears during drag.
4.  **And** Upon release, all 3 nodes have "Selected" style (blue border).
5.  **And** Toolbar "Copy" button becomes enabled.

**Scenario 3: Hierarchy Preservation**
1.  **Given** A tree structure: Root -> Child 1 -> Grandchild 1.
2.  **And** User explicitly selects all 3 nodes.
3.  **When** User performs Copy and Paste.
4.  **Then** 3 new nodes are created.
5.  **And** The edges between new nodes are recreated perfectly (preserving hierarchy).
6.  **And** Relative positions are preserved.

**Scenario 4: Cut & Undo**
1.  **Given** Selected nodes A and B.
2.  **When** User cuts (Cmd+X).
3.  **Then** Nodes A and B are removed from canvas.
4.  **When** User presses Cmd+Z (Undo).
5.  **Then** Nodes A and B reappear in original position.

**Scenario 5: Cross-Graph Paste**
1.  **Given** Two browser tabs: Graph A (Source) and Graph B (Target).
2.  **When** Copy node from Graph A.
3.  **And** Switch to Graph B tab and Paste.
4.  **Then** Node appears in Graph B with new ID.

#### 3.2 Integration Test Spec (Unit/Hook Level)

**`useClipboard.test.ts`**
- **`serializeSelection`**:
  - Should ignore edges if target node is not selected.
  - Should normalize coordinates relative to center.
  - Should include all node data (label, type, metadata).
- **`paste`**:
  - Should generate fresh IDs for all nodes using `nanoid`.
  - Should remap `parentId` to new IDs.
  - Should fail gracefully if clipboard contains invalid JSON.
  - Should fail validation if `source != 'cdm-17'`.

**`useSelection.test.ts`**
- Should dedup selection if same node added twice.
- Should clear selection when `clearSelection()` called.
- `shift+click` should toggle selection state (add/remove).

#### 3.3 Edge Cases & Error Handling

| Case | Expected Behavior |
|------|-------------------|
| **Empty Clipboard** | Toast: "Clipboard is empty" or no action. |
| **Invalid Data** | Toast: "Invalid clipboard content". |
| **Permission Denied** | Toast: "Please allow clipboard access". |
| **Pasting Text** | (Future) Create specific Text Node. Current: Ignore. |
| **Large Paste (500+)** | Warning dialog: "Pasting large amount of data...". |
| **Edit Mode** | Cmd+C/V should act on text in input, NOT nodes. |

### 3.4 FAQ & Behavior Clarifications (关键行为说明) 💡

| Question | Behavior Defined |
|----------|------------------|
| **Q1: 连线会被复制吗?** <br> (Are edges copied?) | **Yes, but only "Internal Edges".** <br> 只有当连线的 **起点** 和 **终点** 都在选中范围内时，该连线才会被复制。若只选中了起点没选中终点，该连线不仅不会复制，粘贴后也不会产生"悬空边"。 |
| **Q2: 属性是否一并复制?** <br> (Are props copied?) | **Yes, everything.** <br> 节点的所有数据（`label`, `metadata`, `tags`, `custom props`）都会被完整序列化并复制。新节点除了 ID 和坐标不同外，数据内容与原节点完全一致。 |
| **Q3: 批量粘贴是否同步?** <br> (Is batch sync?) | **Yes, Atomic Sync.** <br> 粘贴操作被封装在 `ydoc.transact()` 事务中。这意味着对其他协作者而言，这 50 个节点是 **同时** 出现的（Atomic），不会看到节点一个接一个蹦出来的过程。 |

---

## File List

### New Files
| Path | Description |
|------|-------------|
| `packages/types/src/clipboard-types.ts` | Clipboard data interfaces |
| `packages/types/src/schemas/clipboard.schema.ts` | Zod validation schema |
| `apps/web/hooks/useSelection.ts` | Selection state management |
| `apps/web/hooks/useClipboard.ts` | Copy/Cut/Paste logic |
| `apps/web/hooks/useClipboardShortcuts.ts` | Keyboard shortcut handler |
| `apps/web/hooks/useEditingState.ts` | Node editing state tracker |
| `apps/web/__tests__/hooks/useClipboard.test.ts` | Unit tests |
| `apps/web/__tests__/integration/clipboard.test.ts` | Integration tests |
| `apps/web/e2e/clipboard.spec.ts` | E2E tests |

### Modified Files
| Path | Changes |
|------|---------|
| `packages/types/src/index.ts` | Export clipboard types |
| `apps/web/components/editor/GraphComponent.tsx` | Add Selection plugin, integrate shortcuts |
| `apps/web/components/editor/Toolbar.tsx` | Add Copy/Cut/Paste buttons |
| `apps/web/components/editor/ContextMenu.tsx` | Add clipboard menu items |
| `apps/api/src/modules/graphs/graphs.controller.ts` | Add can-paste endpoint |
| `apps/api/src/modules/graphs/graphs.service.ts` | Add checkWriteAccess method |

---

## Dependencies

### Frontend
- `@antv/x6-plugin-selection` - X6 selection plugin (should already be installed)
- `nanoid` - ID generation (should already be installed)
- `sonner` - Toast notifications (should already be installed)

### Backend
- No new dependencies required

---

## Edge Cases & Constraints

1. **Circular References:** Copy/paste preserves structure, but paste always creates new IDs so no true circular reference issues.
2. **Orphan Edges:** Edges with missing endpoints are automatically filtered during serialization (AC2.2).
3. **Large Selections:** Warning toast if >100 nodes selected for clipboard operation. Consider chunked paste for performance.
4. **Cross-Origin Clipboard:** System clipboard access may be blocked in iframes or cross-origin contexts.
5. **Empty Paste:** If clipboard has no valid data, show warning toast and skip.
6. **Permission Denied:** Handle browser clipboard permission denial gracefully with error toast.

---

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2025-12-22 | AI | Initial story draft created |
| 2025-12-22 | AI | Validation applied: Added complete tasks, file list, Yjs integration, test strategy, and all critical improvements |
