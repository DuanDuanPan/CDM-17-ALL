/**
 * Test Utility: Set Approval Status for a Task Node
 * 
 * Run this in Browser Console to test approval data sync:
 * 
 * Example usage:
 * ```javascript
 * // 1. Copy this entire file content into Console
 * 
 * // 2. Set approval status
 * setApprovalStatus('0869d487-81f5-4d06-a261-6f9ca96e6eb6', 'APPROVED');
 * setApprovalStatus('0869d487-81f5-4d06-a261-6f9ca96e6eb6', 'PENDING');
 * setApprovalStatus('0869d487-81f5-4d06-a261-6f9ca96e6eb6', 'REJECTED');
 * 
 * // 3. Clear approval status
 * setApprovalStatus('0869d487-81f5-4d06-a261-6f9ca96e6eb6', null);
 * ```
 */

function setApprovalStatus(nodeId, status) {
    // Access the X6 graph instance
    const graph = window.__x6Graph__;
    if (!graph) {
        console.error('[Test] X6 Graph not found! Make sure __x6Graph__ is exposed.');
        return;
    }

    const node = graph.getCellById(nodeId);
    if (!node || !node.isNode()) {
        console.error(`[Test] Node ${nodeId} not found!`);
        return;
    }

    const currentData = node.getData();

    if (status === null || status === undefined) {
        // Clear approval
        const { approval, ...rest } = currentData;
        node.setData(rest);
        console.log(`[Test] Cleared approval for node ${nodeId}`);
    } else {
        // Set approval
        const approval = {
            status,
            currentStepIndex: 0,
            steps: [{
                name: '测试审批',
                index: 0,
                status: status === 'APPROVED' ? 'approved' : status === 'PENDING' ? 'pending' : 'rejected',
                assigneeId: 'test-user',
                completedAt: status !== 'PENDING' ? new Date().toISOString() : null,
            }],
            history: [{
                action: status === 'APPROVED' ? 'approved' : status === 'PENDING' ? 'submitted' : 'rejected',
                actorId: 'test-user',
                stepIndex: 0,
                timestamp: new Date().toISOString(),
            }],
        };

        node.setData({
            ...currentData,
            approval,
        });

        console.log(`[Test] Set approval to ${status} for node ${nodeId}`, { approval });
    }

    // Verify
    const updatedData = node.getData();
    console.log('[Test] Node data after update:', {
        nodeId: node.id,
        approval: updatedData.approval,
        approvalStatus: updatedData.approval?.status,
    });
}

console.log('[Test] Approval test utility loaded! Use: setApprovalStatus(nodeId, status)');
console.log('[Test] Example: setApprovalStatus("0869d487-81f5-4d06-a261-6f9ca96e6eb6", "APPROVED")');
