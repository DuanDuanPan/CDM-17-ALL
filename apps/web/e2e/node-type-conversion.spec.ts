/**
 * Story 2.1: Node Type Conversion E2E Tests
 * Tests for semantic node types and dynamic property panel
 */

import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

const waitForApi = (page: Page, method: string, path: string) =>
  page.waitForResponse((res) => res.url().includes(path) && res.request().method() === method && res.ok());

const waitForNodeReady = async (page: Page) => {
  const timeout = 5000;
  await Promise.race([
    page.waitForResponse(
      (res) => res.url().includes('/api/nodes/') && res.request().method() === 'GET' && res.status() === 200,
      { timeout }
    ),
    page.waitForResponse(
      (res) => res.url().includes('/api/nodes') && res.request().method() === 'POST' && res.status() < 300,
      { timeout }
    ),
    page.locator('aside:has-text("属性面板")').waitFor({ state: 'visible', timeout }),
  ]).catch(() => {});
};

test.describe('Node Type Conversion', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await gotoTestGraph(page, testInfo);
  });

  test('TC-2.1-1: Type switch updates property panel immediately', async ({ page }) => {
    // Given: A node exists on canvas
    const rootNode = page.locator('.x6-node').first();
    await expect(rootNode).toBeVisible();

    // When: User clicks the node to select it
    await rootNode.click();
    await waitForNodeReady(page);
    await page.waitForTimeout(100);

    // Then: Property panel should open
    const propertyPanel = page.locator('aside:has-text("属性面板")');
    await expect(propertyPanel).toBeVisible();

    await expect(propertyPanel.locator('label:has-text("节点标题")')).toBeVisible();

    // When: User changes type to PBS via dropdown
    const typeSelect = propertyPanel.locator('select').first();
    await expect(typeSelect).toBeVisible();
    await Promise.all([
      waitForApi(page, 'PATCH', '/type'),
      typeSelect.selectOption('PBS'),
    ]);
    await page.waitForTimeout(200);

    // Then: Property panel should render PBS-specific fields
    const pbsCodeLabel = propertyPanel.locator('label:has-text("PBS 编码")');
    await expect(pbsCodeLabel).toBeVisible();

    const pbsVersionLabel = propertyPanel.locator('label:has-text("版本号")');
    await expect(pbsVersionLabel).toBeVisible();

    const pbsOwnerLabel = propertyPanel.locator('label:has-text("负责人")');
    await expect(pbsOwnerLabel).toBeVisible();

    // And: Node should show PBS icon on canvas
    await expect(rootNode.locator('.lucide-box').first()).toBeVisible();
  });

  test('TC-2.1-2: Type switch from PBS to Task updates panel content', async ({ page }) => {
    // Given: A node is converted to PBS type
    const rootNode = page.locator('.x6-node').first();
    await rootNode.click();
    await waitForNodeReady(page);
    await page.waitForTimeout(100);

    const propertyPanel = page.locator('aside:has-text("属性面板")');
    const typeSelect = propertyPanel.locator('select').first();
    await Promise.all([
      waitForApi(page, 'PATCH', '/type'),
      typeSelect.selectOption('PBS'),
    ]);
    await page.waitForTimeout(200);

    // When: Enter PBS code
    const pbsCodeInput = propertyPanel.locator('input[placeholder*="PBS-"]');
    await pbsCodeInput.fill('PBS-001');
    await page.waitForTimeout(100);

    // When: Switch type to Task
    await Promise.all([
      waitForApi(page, 'PATCH', '/type'),
      typeSelect.selectOption('TASK'),
    ]);
    await page.waitForTimeout(200);

    // Then: Panel should now show Task-specific fields
    const statusLabel = propertyPanel.locator('label:has-text("状态")');
    await expect(statusLabel).toBeVisible();

    const priorityLabel = propertyPanel.locator('label:has-text("优先级")');
    await expect(priorityLabel).toBeVisible();

    const assigneeLabel = propertyPanel.locator('label:has-text("执行人")');
    await expect(assigneeLabel).toBeVisible();

    const dueDateLabel = propertyPanel.locator('label:has-text("截止时间")');
    await expect(dueDateLabel).toBeVisible();

    // And: PBS code field should no longer be visible
    const pbsCodeField = propertyPanel.locator('input[placeholder*="PBS-"]');
    await expect(pbsCodeField).not.toBeVisible();
  });

  test('TC-2.1-3: All node types render correctly', async ({ page }) => {
    const rootNode = page.locator('.x6-node').first();
    await rootNode.click();
    await waitForNodeReady(page);
    await page.waitForTimeout(100);

    const propertyPanel = page.locator('aside:has-text("属性面板")');
    const typeSelect = propertyPanel.locator('select').first();

    // Test Task type
    await Promise.all([
      waitForApi(page, 'PATCH', '/type'),
      typeSelect.selectOption('TASK'),
    ]);
    await page.waitForTimeout(200);
    await expect(propertyPanel.locator('label:has-text("状态")')).toBeVisible();

    // Test Requirement type
    await Promise.all([
      waitForApi(page, 'PATCH', '/type'),
      typeSelect.selectOption('REQUIREMENT'),
    ]);
    await page.waitForTimeout(200);
    await expect(propertyPanel.locator('label:has-text("需求类型")')).toBeVisible();
    await expect(propertyPanel.locator('label:has-text("验收标准")')).toBeVisible();

    // Test PBS type
    await Promise.all([
      waitForApi(page, 'PATCH', '/type'),
      typeSelect.selectOption('PBS'),
    ]);
    await page.waitForTimeout(200);
    await expect(propertyPanel.locator('label:has-text("PBS 编码")')).toBeVisible();

    // Test Data type
    await Promise.all([
      waitForApi(page, 'PATCH', '/type'),
      typeSelect.selectOption('DATA'),
    ]);
    await page.waitForTimeout(200);
    await expect(propertyPanel.locator('label:has-text("数据类型")')).toBeVisible();
    await expect(propertyPanel.locator('label:has-text("版本号")')).toBeVisible();
    await expect(propertyPanel.locator('label:has-text("密级")')).toBeVisible();

    // Test Ordinary type
    await Promise.all([
      waitForApi(page, 'PATCH', '/type'),
      typeSelect.selectOption('ORDINARY'),
    ]);
    await page.waitForTimeout(200);
    await expect(propertyPanel.locator('label:has-text("描述")')).toBeVisible();
  });

  test('TC-2.1-4: Task checkbox updates status visually', async ({ page }) => {
    const rootNode = page.locator('.x6-node').first();
    await rootNode.click();
    await waitForNodeReady(page);
    await page.waitForTimeout(100);

    const propertyPanel = page.locator('aside:has-text("属性面板")');
    const typeSelect = propertyPanel.locator('select').first();

    // Convert to Task type
    await Promise.all([
      waitForApi(page, 'PATCH', '/type'),
      typeSelect.selectOption('TASK'),
    ]);
    await page.waitForTimeout(200);

    // Mark task as done via property panel status
    const statusSelect = propertyPanel.locator('label:has-text("状态")').locator('..').locator('select');
    await Promise.all([
      waitForApi(page, 'PATCH', '/properties'),
      statusSelect.selectOption('done'),
    ]);
    await page.waitForTimeout(200);

    // Verify done style is shown on node
    await expect(rootNode.locator('.line-through').first()).toBeVisible();
  });

  test('TC-2.1-5: Requirement priority badges display correctly', async ({ page }) => {
    const rootNode = page.locator('.x6-node').first();
    await rootNode.click();
    await waitForNodeReady(page);
    await page.waitForTimeout(100);

    const propertyPanel = page.locator('aside:has-text("属性面板")');
    const typeSelect = propertyPanel.locator('select').first();

    // Convert to Requirement type
    await Promise.all([
      waitForApi(page, 'PATCH', '/type'),
      typeSelect.selectOption('REQUIREMENT'),
    ]);
    await page.waitForTimeout(200);

    // NOTE: Default priority is "must"; start from a non-default value to ensure change events fire.
    // Test "Should Have" priority
    const prioritySelect = propertyPanel.locator('select').nth(1);
    await prioritySelect.selectOption('should');
    await expect(propertyPanel.locator('span.bg-orange-100:has-text("Should Have")')).toBeVisible();

    // Test "Could Have" priority
    await prioritySelect.selectOption('could');
    await expect(propertyPanel.locator('span.bg-yellow-100:has-text("Could Have")')).toBeVisible();

    // Test "Must Have" priority
    await prioritySelect.selectOption('must');
    await expect(propertyPanel.locator('span.bg-red-100:has-text("Must Have")')).toBeVisible();
  });

  test('TC-2.1-6: Data node secret level badges display correctly', async ({ page }) => {
    const rootNode = page.locator('.x6-node').first();
    await rootNode.click();
    await waitForNodeReady(page);
    await page.waitForTimeout(100);

    const propertyPanel = page.locator('aside:has-text("属性面板")');
    const typeSelect = propertyPanel.locator('select').first();

    // Convert to Data type
    await Promise.all([
      waitForApi(page, 'PATCH', '/type'),
      typeSelect.selectOption('DATA'),
    ]);
    await page.waitForTimeout(200);

    const secretLevelSelect = propertyPanel.locator('label:has-text("密级")').locator('..').locator('select');
    const secretLevelBadge = propertyPanel.locator('[data-testid="data-secret-level-badge"]');

    await expect(secretLevelSelect).toBeVisible();
    await expect(secretLevelBadge).toBeVisible();

    // Test "secret" level
    await Promise.all([
      waitForApi(page, 'PATCH', '/properties'),
      secretLevelSelect.selectOption('secret'),
    ]);
    await page.waitForTimeout(100);
    await expect(secretLevelBadge).toHaveText('机密');

    // Test "internal" level
    await Promise.all([
      waitForApi(page, 'PATCH', '/properties'),
      secretLevelSelect.selectOption('internal'),
    ]);
    await page.waitForTimeout(100);
    await expect(secretLevelBadge).toHaveText('内部');

    // Test "public" level
    await Promise.all([
      waitForApi(page, 'PATCH', '/properties'),
      secretLevelSelect.selectOption('public'),
    ]);
    await page.waitForTimeout(100);
    await expect(secretLevelBadge).toHaveText('公开');
  });

  test('TC-2.1-7: Common header displays for all node types', async ({ page }) => {
    const rootNode = page.locator('.x6-node').first();
    await rootNode.click();
    await waitForNodeReady(page);
    await page.waitForTimeout(100);

    const propertyPanel = page.locator('aside:has-text("属性面板")');
    const typeSelect = propertyPanel.locator('select').first();

    // Check common header exists
    const nodeTitle = propertyPanel.locator('label:has-text("节点标题")');
    await expect(nodeTitle).toBeVisible();

    const createdAt = propertyPanel.locator('label:has-text("创建时间")');
    await expect(createdAt).toBeVisible();

    const updatedAt = propertyPanel.locator('label:has-text("最后修改")');
    await expect(updatedAt).toBeVisible();

    // Switch types and verify header persists
    const nodeTypes = ['TASK', 'REQUIREMENT', 'PBS', 'DATA', 'ORDINARY'];
    for (const type of nodeTypes) {
      await Promise.all([
        waitForApi(page, 'PATCH', '/type'),
        typeSelect.selectOption(type),
      ]);
      await page.waitForTimeout(100);
      await expect(nodeTitle).toBeVisible();
      await expect(createdAt).toBeVisible();
      await expect(updatedAt).toBeVisible();
    }
  });
});
