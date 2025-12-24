import { createContext, useContext } from 'react';
import { NodeType, MindNodeData } from '@cdm/types';

/**
 * RichNodeContext - Shared state for Rich Node components
 * Avoids props drilling and provides centralized access to node state
 */
export interface RichNodeContextValue {
    /** Node type determines visual styling */
    nodeType: NodeType;
    /** Whether node is in editing mode */
    isEditing: boolean;
    /** Whether node is selected */
    isSelected: boolean;
    /** Full node data for advanced rendering */
    nodeData: MindNodeData;
}

export const RichNodeContext = createContext<RichNodeContextValue | null>(null);

/**
 * Hook to access RichNodeContext
 * @throws Error if used outside RichNodeContext.Provider
 */
export function useRichNode(): RichNodeContextValue {
    const context = useContext(RichNodeContext);
    if (!context) {
        throw new Error('useRichNode must be used within RichNodeContext.Provider');
    }
    return context;
}
