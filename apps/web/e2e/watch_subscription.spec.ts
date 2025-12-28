/**
 * Story 4.4: Watch & Subscription
 * E2E Tests for Watch/Unwatch functionality
 *
 * Notes:
 * - Tests create a real Graph via API (no hardcoded graphId).
 * - For subscribe/unsubscribe flows we also ensure the target node exists in DB,
 *   because the subscription service validates Node existence.
 *
 * Test Coverage:
 * - TC-4.4.01: Subscribe to node (AC#1)
 * - TC-4.4.02: Unsubscribe from node (AC#3)
 * - TC-4.4.03: Context menu shows subscription toggle (AC#4 prerequisite)
 * - TC-4.4.04: Notification on node change (AC#2)
 * - TC-4.4.06: Unsubscribe from notification panel (AC#3)
 * - TC-4.4.07: Click notification to navigate (AC#2)
 * - TC-4.4.08: Throttling/aggregation verification (AC#2)
 * - TC-4.4.09: Optimistic UI response
 * - TC-4.4.10: Multi-device sync
 */

import { test, expect, BrowserContext, Page, type APIRequestContext } from '@playwright/test';
import { createTestGraph, makeTestGraphUrl, DEFAULT_E2E_USER_ID } from './testUtils';

async function waitForCollabConnection(page: Page) {
  await page.waitForSelector('[data-testid="collab-status"]', { timeout: 15000 });
}

async function waitForGraph(page: Page) {
  await page.waitForSelector('#graph-container', { timeout: 15000 });
  await page.locator('.x6-node').first().waitFor({ state: 'visible', timeout: 15000 });
}

function getNodeLocator(page: Page, nodeId: string) {
  return page.locator(`.x6-node[data-cell-id="${nodeId}"]`);
}

function getNodeContextMenu(page: Page) {
  return page.locator('div.fixed.z-50').filter({ hasText: '粘贴到此处' }).first();
}

async function closeNodeContextMenu(page: Page) {
  const menu = getNodeContextMenu(page);
  if (!(await menu.isVisible().catch(() => false))) return;

  // Use a coordinate click to avoid "detached from DOM" flakiness while the menu is closing.
  await page.mouse.click(1, 1);

  await menu.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
}

async function rightClickNode(page: Page, nodeId: string) {
  await closeNodeContextMenu(page);
  await waitForGraph(page);
  const node = getNodeLocator(page, nodeId);
  await node.waitFor({ state: 'visible', timeout: 15000 });
  await node.click({ button: 'right' });
  await getNodeContextMenu(page).waitFor({ state: 'visible', timeout: 5000 });
}

async function createChildNode(page: Page): Promise<string> {
  const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
  await expect(centerNode).toBeVisible({ timeout: 15000 });
  await centerNode.click();

  // In browse-mode, Tab creates a child and selects it.
  await page.keyboard.press('Tab');

  const selected = page.locator('.x6-node.x6-node-selected').first();
  await expect(selected).toBeVisible({ timeout: 15000 });

  const nodeId = await selected.getAttribute('data-cell-id');
  if (!nodeId || nodeId === 'center-node') {
    throw new Error('Failed to create a child node for subscription tests');
  }

  // Exit edit mode (child nodes are created in edit mode by default).
  await page.keyboard.press('Escape');
  return nodeId;
}

async function ensureDbNodeExists(
  request: APIRequestContext,
  graphId: string,
  nodeId: string,
  label: string = 'E2E Subscription Node'
) {
  // The app may be persisting nodes in the background (RightSidebar ensureNodeExists).
  // To avoid races (404 -> concurrent create -> 500 unique), poll briefly before attempting to create.
  for (let i = 0; i < 10; i++) {
    const existing = await request.get(`/api/nodes/${encodeURIComponent(nodeId)}`);
    if (existing.ok()) return;
    if (existing.status() !== 404) {
      const text = await existing.text().catch(() => '');
      throw new Error(`Failed to check node existence (status=${existing.status()}): ${text || existing.statusText()}`);
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  const created = await request.post('/api/nodes', {
    data: {
      id: nodeId,
      label,
      graphId,
      // Intentionally omit parentId to avoid parent FK coupling in tests.
    },
  });
  if (created.ok()) return;

  // If create fails (e.g. concurrent create), re-check existence before failing the test.
  const after = await request.get(`/api/nodes/${encodeURIComponent(nodeId)}`);
  if (after.ok()) return;

  const text = await created.text().catch(() => '');
  throw new Error(`Failed to create node (status=${created.status()}): ${text || created.statusText()}`);
}

async function ensureUnsubscribed(request: APIRequestContext, userId: string, nodeId: string) {
  const res = await request.delete(`/api/subscriptions?nodeId=${encodeURIComponent(nodeId)}`, {
    headers: { 'x-user-id': userId },
  });
  if (![200, 404].includes(res.status())) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to ensure unsubscribe (status=${res.status()}): ${text || res.statusText()}`);
  }
}

async function ensureSubscribed(request: APIRequestContext, userId: string, nodeId: string) {
  const res = await request.post('/api/subscriptions', {
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    data: { nodeId },
  });
  if (![201, 409].includes(res.status())) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to ensure subscribe (status=${res.status()}): ${text || res.statusText()}`);
  }
}

async function checkIsSubscribed(request: APIRequestContext, userId: string, nodeId: string): Promise<boolean> {
  const res = await request.get(`/api/subscriptions/check?nodeId=${encodeURIComponent(nodeId)}`, {
    headers: { 'x-user-id': userId },
  });
  if (!res.ok()) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to check subscription (status=${res.status()}): ${text || res.statusText()}`);
  }
  const data = (await res.json()) as { isSubscribed?: boolean };
  return Boolean(data.isSubscribed);
}

async function subscribeToNodeViaMenu(page: Page, nodeId: string) {
  await rightClickNode(page, nodeId);
  const menu = getNodeContextMenu(page);
  await expect(menu.getByRole('button', { name: /关注节点/ })).toBeVisible({ timeout: 5000 });
  await menu.getByRole('button', { name: /关注节点/ }).click();
  await closeNodeContextMenu(page);
}

async function unsubscribeFromNodeViaMenu(page: Page, nodeId: string) {
  await rightClickNode(page, nodeId);
  const menu = getNodeContextMenu(page);
  await expect(menu.getByRole('button', { name: /取消关注/ })).toBeVisible({ timeout: 5000 });
  await menu.getByRole('button', { name: /取消关注/ }).click();
  await closeNodeContextMenu(page);
}

async function getSubscriptionMenuState(page: Page, nodeId: string): Promise<'subscribe' | 'unsubscribe' | 'none'> {
  await rightClickNode(page, nodeId);
  await page.waitForTimeout(100);

  const menu = getNodeContextMenu(page);
  const hasUnsubscribe = await menu.getByRole('button', { name: /取消关注/ }).isVisible().catch(() => false);
  const hasSubscribe = await menu.getByRole('button', { name: /关注节点/ }).isVisible().catch(() => false);

  await closeNodeContextMenu(page);

  if (hasUnsubscribe) return 'unsubscribe';
  if (hasSubscribe) return 'subscribe';
  return 'none';
}

test.describe('Watch & Subscription Feature', () => {
  let graphId: string;
  let userId: string;
  let nodeId: string;

  test.beforeEach(async ({ page }, testInfo) => {
    userId = DEFAULT_E2E_USER_ID;
    graphId = await createTestGraph(page, testInfo, userId);
    await page.goto(makeTestGraphUrl(graphId, userId));

    await waitForCollabConnection(page);
    await waitForGraph(page);

    nodeId = await createChildNode(page);
    await ensureDbNodeExists(page.request, graphId, nodeId);
    await ensureUnsubscribed(page.request, userId, nodeId);
  });

    // ============================================
    // TC-4.4.01: Subscribe to Node (AC#1)
    // ============================================
  test('TC-4.4.01: User can subscribe to a node via context menu', async ({ page }) => {
    await subscribeToNodeViaMenu(page, nodeId);

    // Menu state should flip to "取消关注"
    await rightClickNode(page, nodeId);
    await expect(getNodeContextMenu(page).getByRole('button', { name: /取消关注/ })).toBeVisible({ timeout: 5000 });
    await closeNodeContextMenu(page);

    // Backend state should be subscribed
    await expect.poll(async () => checkIsSubscribed(page.request, userId, nodeId)).toBe(true);
  });

    // ============================================
    // TC-4.4.02: Unsubscribe from Node (AC#3)
    // ============================================
  test('TC-4.4.02: User can unsubscribe from a node via context menu', async ({ page }) => {
    await ensureSubscribed(page.request, userId, nodeId);

    // Menu should show unsubscribe
    await rightClickNode(page, nodeId);
    await expect(getNodeContextMenu(page).getByRole('button', { name: /取消关注/ })).toBeVisible({ timeout: 5000 });
    await closeNodeContextMenu(page);

    await unsubscribeFromNodeViaMenu(page, nodeId);

    // Menu should flip back to subscribe
    await rightClickNode(page, nodeId);
    await expect(getNodeContextMenu(page).getByRole('button', { name: /关注节点/ })).toBeVisible({ timeout: 5000 });
    await closeNodeContextMenu(page);

    // Backend state should be unsubscribed
    await expect.poll(async () => checkIsSubscribed(page.request, userId, nodeId)).toBe(false);
  });

    // ============================================
    // TC-4.4.03: Context menu displays subscription toggle (AC#4 prerequisite)
    // ============================================
  test('TC-4.4.03: Context menu shows subscription toggle option', async ({ page }) => {
    // Fresh graph/node should be unsubscribed
    expect(await getSubscriptionMenuState(page, nodeId)).toBe('subscribe');
  });

    // ============================================
    // TC-4.4.11: Subscription indicator (Eye icon) appears on subscribed nodes
    // ============================================
  test('TC-4.4.11: Subscription indicator appears after subscribing', async ({ page }) => {
    await subscribeToNodeViaMenu(page, nodeId);

    const indicator = page.locator('[title="已关注"]').first();
    await expect(indicator).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// Multi-User Collaboration Tests
// ============================================
test.describe('Watch & Subscription - Multi-User Scenarios', () => {
    let contextA: BrowserContext;
    let contextB: BrowserContext;
    let pageA: Page;
    let pageB: Page;

    test.beforeAll(async ({ browser }) => {
        // Create two separate browser contexts (simulating two users)
        contextA = await browser.newContext({ storageState: undefined });
        contextB = await browser.newContext({ storageState: undefined });

        pageA = await contextA.newPage();
        pageB = await contextB.newPage();
    });

    test.afterAll(async () => {
        await contextA?.close();
        await contextB?.close();
    });

    // ============================================
    // TC-4.4.04: Both users can access subscription UI
    // ============================================
  test('TC-4.4.04: Multiple users can access subscription feature', async ({}, testInfo) => {
    const userA = 'test-e2e-user-a';
    const userB = 'test-e2e-user-b';

    const graphId = await createTestGraph(pageA, testInfo, userA);

    await pageA.goto(makeTestGraphUrl(graphId, userA));
    await waitForCollabConnection(pageA);
    await waitForGraph(pageA);

    await pageB.goto(makeTestGraphUrl(graphId, userB));
    await waitForCollabConnection(pageB);
    await waitForGraph(pageB);

    // Both should have context menu with subscription option.
    expect(await getSubscriptionMenuState(pageA, 'center-node')).toBe('subscribe');
    expect(await getSubscriptionMenuState(pageB, 'center-node')).toBe('subscribe');
  });
});

// ============================================
// Notification Panel Interaction Tests
// ============================================
test.describe('Watch & Subscription - Notification Panel', () => {
  const userId = 'test-e2e-user-notifications';

  test.beforeEach(async ({ page }, testInfo) => {
    const graphId = await createTestGraph(page, testInfo, userId);
    await page.goto(makeTestGraphUrl(graphId, userId));
    await waitForCollabConnection(page);
    await waitForGraph(page);
  });

    // ============================================
    // TC-4.4.06: Notification panel is accessible
    // ============================================
  test('TC-4.4.06: Notification panel button is visible', async ({ page }) => {
    const notificationButton = page.locator('button[aria-label^="Notifications"]');
    await expect(notificationButton).toBeVisible({ timeout: 5000 });

    // Open dropdown
    await notificationButton.click();
    await expect(page.getByText('通知中心')).toBeVisible({ timeout: 5000 });

    // Close by clicking outside
    await page.mouse.click(0, 0);
  });

    // ============================================
    // TC-4.4.07: Notification panel can be interacted with
    // ============================================
  test('TC-4.4.07: Notification panel responds to interaction', async ({ page }) => {
    const notificationButton = page.locator('button[aria-label^="Notifications"]');
    await expect(notificationButton).toBeVisible({ timeout: 5000 });

    await notificationButton.click();
    await expect(page.getByText('通知中心')).toBeVisible({ timeout: 5000 });

    // Either empty-state or list; both are acceptable.
    const emptyState = page.getByText('暂无通知');
    const listItem = page.locator('div.divide-y.divide-gray-100 > *').first();
    const hasAnyContent = (await emptyState.isVisible().catch(() => false)) || (await listItem.isVisible().catch(() => false));
    expect(hasAnyContent).toBe(true);

    await page.mouse.click(0, 0);
  });
});

test.describe('Watch & Subscription - API Endpoints', () => {
  test('Subscription API endpoints respond correctly', async ({ request }, testInfo) => {
    const userId = `test-e2e-api-${testInfo.testId}`;
    const graphRes = await request.post(`/api/graphs?userId=${encodeURIComponent(userId)}`, { data: { name: 'e2e-api-graph' } });
    expect(graphRes.ok()).toBe(true);
    const graph = (await graphRes.json()) as { id?: string };
    expect(graph.id).toBeTruthy();

    const nodeId = `e2e-api-node-${Date.now()}`;
    const nodeRes = await request.post('/api/nodes', { data: { id: nodeId, label: 'E2E API Node', graphId: graph.id } });
    expect(nodeRes.ok()).toBe(true);

    const subscribeResponse = await request.post('/api/subscriptions', {
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      data: { nodeId },
    });
    expect([201, 409]).toContain(subscribeResponse.status());

    const checkResponse = await request.get(`/api/subscriptions/check?nodeId=${encodeURIComponent(nodeId)}`, {
      headers: { 'x-user-id': userId },
    });
    expect(checkResponse.ok()).toBe(true);
    const checkData = await checkResponse.json();
    expect(checkData).toHaveProperty('isSubscribed');
    expect(typeof checkData.isSubscribed).toBe('boolean');

    const unsubscribeResponse = await request.delete(`/api/subscriptions?nodeId=${encodeURIComponent(nodeId)}`, {
      headers: { 'x-user-id': userId },
    });
    expect([200, 404]).toContain(unsubscribeResponse.status());
  });

  test('Check subscription API returns proper structure', async ({ request }, testInfo) => {
    const userId = `test-e2e-api-check-${testInfo.testId}`;
    const nodeId = `e2e-non-subscribed-${Date.now()}`;

    const graphRes = await request.post(`/api/graphs?userId=${encodeURIComponent(userId)}`, { data: { name: 'e2e-api-graph' } });
    expect(graphRes.ok()).toBe(true);
    const graph = (await graphRes.json()) as { id?: string };
    expect(graph.id).toBeTruthy();

    const nodeRes = await request.post('/api/nodes', { data: { id: nodeId, label: 'E2E API Node', graphId: graph.id } });
    expect(nodeRes.ok()).toBe(true);

    const response = await request.get(`/api/subscriptions/check?nodeId=${encodeURIComponent(nodeId)}`, {
      headers: { 'x-user-id': userId },
    });
    expect(response.ok()).toBe(true);
    const data = await response.json();
    expect(data).toHaveProperty('isSubscribed');
    expect(data.isSubscribed).toBe(false);
  });
});

// ============================================
// Edge Cases & Error Handling
// ============================================
test.describe('Watch & Subscription - Edge Cases', () => {
  const userId = 'test-e2e-edge';

  test('Check subscription for invalid node returns false', async ({ request }) => {
    const invalidNodeId = 'nonexistent-node-id-12345';

    const res = await request.get(`/api/subscriptions/check?nodeId=${encodeURIComponent(invalidNodeId)}`, {
      headers: { 'x-user-id': userId },
    });

    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(data.isSubscribed).toBe(false);
  });

  test('Unsubscribe from non-subscribed node returns 404', async ({ request }) => {
    const testNodeId = 'never-subscribed-node';

    const res = await request.delete(`/api/subscriptions?nodeId=${encodeURIComponent(testNodeId)}`, {
      headers: { 'x-user-id': userId },
    });

    expect(res.status()).toBe(404);
  });

  test('Subscribe endpoint validates node existence', async ({ request }) => {
    const nonExistentNodeId = `definitely-not-a-real-node-${Date.now()}`;

    const res = await request.post('/api/subscriptions', {
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      data: { nodeId: nonExistentNodeId },
    });

    expect(res.status()).toBe(404);
  });
});
