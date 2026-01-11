'use client';

// Online3DViewer provides `mesh.userData.originalMeshInstance` for each rendered mesh/line.
// We use it to map a mesh back to its model node and decide whether it should be highlighted.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isMeshUserDataInNodeSubtree(meshUserData: any, nodeId: number) {
  const meshInstance = meshUserData?.originalMeshInstance;

  // OV v0.18.0: MeshInstance exposes `node` (no GetNode()).
  // Keep GetNode() as a fallback for potential future versions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let node: any = meshInstance?.node ?? meshInstance?.GetNode?.();

  while (node) {
    if (node.GetId?.() === nodeId) return true;
    node = node.GetParent?.();
  }

  return false;
}

