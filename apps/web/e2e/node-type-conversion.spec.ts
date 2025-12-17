/**
 * Story 2.1: Node Type Conversion E2E Tests
 * Tests for semantic node types and dynamic property panel
 */

import { test, expect } from '@playwright/test';

test.describe('Node Type Conversion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#graph-container');
  });

  test('TC-2.1-1: Type switch updates property panel immediately', async ({ page }) => {
    // Given: A node exists on canvas
    const rootNode = page.locator('.x6-node').first();
    await expect(rootNode).toBeVisible();

    // When: User clicks the node to select it
    await rootNode.click();
    await page.waitForTimeout(100);

    // Then: Property panel should open
    const propertyPanel = page.locator('aside:has-text("属性面板")');
    await expect(propertyPanel).toBeVisible();

    await expect(propertyPanel.locator('label:has-text("节点标题")')).toBeVisible();

    // When: User changes type to PBS via dropdown
    const typeSelect = propertyPanel.locator('select').first();
    await expect(typeSelect).toBeVisible();
    await typeSelect.selectOption('PBS');
    await page.waitForTimeout(200);

    // Then: Property panel should render PBS-specific fields
    const pbsCodeLabel = propertyPanel.locator('label:has-text("PBS 编码")');
    await expect(pbsCodeLabel).toBeVisible();

    const pbsVersionLabel = propertyPanel.locator('label:has-text("版本号")');
    await expect(pbsVersionLabel).toBeVisible();

    const pbsOwnerLabel = propertyPanel.locator('label:has-text("负责人")');
    await expect(pbsOwnerLabel).toBeVisible();

    // And: Node should show PBS icon on canvas
    const nodeIcon = rootNode.locator('svg');
    await expect(nodeIcon).toBeVisible();
  });

  test('TC-2.1-2: Type switch from PBS to Task updates panel content', async ({ page }) => {
    // Given: A node is converted to PBS type
    const rootNode = page.locator('.x6-node').first();
    await rootNode.click();
    await page.waitForTimeout(100);

    const propertyPanel = page.locator('aside:has-text("属性面板")');
    const typeSelect = propertyPanel.locator('select').first();
    await typeSelect.selectOption('PBS');
    await page.waitForTimeout(200);

    // When: Enter PBS code
    const pbsCodeInput = propertyPanel.locator('input[placeholder*="PBS-"]');
    await pbsCodeInput.fill('PBS-001');
    await page.waitForTimeout(100);

    // When: Switch type to Task
    await typeSelect.selectOption('TASK');
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
    await page.waitForTimeout(100);

    const propertyPanel = page.locator('aside:has-text("属性面板")');
    const typeSelect = propertyPanel.locator('select').first();

    // Test Task type
    await typeSelect.selectOption('TASK');
    await page.waitForTimeout(200);
    await expect(propertyPanel.locator('label:has-text("状态")')).toBeVisible();

    // Test Requirement type
    await typeSelect.selectOption('REQUIREMENT');
    await page.waitForTimeout(200);
    await expect(propertyPanel.locator('label:has-text("需求类型")')).toBeVisible();
    await expect(propertyPanel.locator('label:has-text("验收标准")')).toBeVisible();

    // Test PBS type
    await typeSelect.selectOption('PBS');
    await page.waitForTimeout(200);
    await expect(propertyPanel.locator('label:has-text("PBS 编码")')).toBeVisible();

    // Test Data type
    await typeSelect.selectOption('DATA');
    await page.waitForTimeout(200);
    await expect(propertyPanel.locator('label:has-text("数据类型")')).toBeVisible();
    await expect(propertyPanel.locator('label:has-text("版本号")')).toBeVisible();
    await expect(propertyPanel.locator('label:has-text("密级")')).toBeVisible();

    // Test Ordinary type
    await typeSelect.selectOption('ORDINARY');
    await page.waitForTimeout(200);
    await expect(propertyPanel.locator('label:has-text("描述")')).toBeVisible();
  });

  test('TC-2.1-4: Task checkbox updates status visually', async ({ page }) => {
    const rootNode = page.locator('.x6-node').first();
    await rootNode.click();
    await page.waitForTimeout(100);

    const propertyPanel = page.locator('aside:has-text("属性面板")');
    const typeSelect = propertyPanel.locator('select').first();

    // Convert to Task type
    await typeSelect.selectOption('TASK');
    await page.waitForTimeout(200);

    // Change status to "done"
    const statusSelect = propertyPanel.locator('select').nth(1); // Second select is status
    await statusSelect.selectOption('done');
    await page.waitForTimeout(200);

    // Verify status badge shows "已完成" (with checkmark)
    const statusBadge = propertyPanel.locator('span.bg-green-100:has-text("已完成")');
    await expect(statusBadge).toBeVisible();
  });

  test('TC-2.1-5: Requirement priority badges display correctly', async ({ page }) => {
    const rootNode = page.locator('.x6-node').first();
    await rootNode.click();
    await page.waitForTimeout(100);

    const propertyPanel = page.locator('aside:has-text("属性面板")');
    const typeSelect = propertyPanel.locator('select').first();

    // Convert to Requirement type
    await typeSelect.selectOption('REQUIREMENT');
    await page.waitForTimeout(200);

    // Test "Must Have" priority
    const prioritySelect = propertyPanel.locator('select').nth(1);
    await prioritySelect.selectOption('must');
    await page.waitForTimeout(100);
    await expect(propertyPanel.locator('span.bg-red-100:has-text("Must Have")')).toBeVisible();

    // Test "Should Have" priority
    await prioritySelect.selectOption('should');
    await page.waitForTimeout(100);
    await expect(propertyPanel.locator('span.bg-orange-100:has-text("Should Have")')).toBeVisible();

    // Test "Could Have" priority
    await prioritySelect.selectOption('could');
    await page.waitForTimeout(100);
    await expect(propertyPanel.locator('span.bg-yellow-100:has-text("Could Have")')).toBeVisible();
  });

  test('TC-2.1-6: Data node secret level badges display correctly', async ({ page }) => {
    const rootNode = page.locator('.x6-node').first();
    await rootNode.click();
    await page.waitForTimeout(100);

    const propertyPanel = page.locator('aside:has-text("属性面板")');
    const typeSelect = propertyPanel.locator('select').first();

    // Convert to Data type
    await typeSelect.selectOption('DATA');
    await page.waitForTimeout(200);

    // Test "secret" level - use span selector to avoid matching option element
    const secretLevelSelect = propertyPanel.locator('select').nth(2); // Third select is secret level
    await secretLevelSelect.selectOption('secret');
    await page.waitForTimeout(100);
    await expect(propertyPanel.locator('span.bg-red-100:has-text("机密")')).toBeVisible();

    // Test "internal" level
    await secretLevelSelect.selectOption('internal');
    await page.waitForTimeout(100);
    await expect(propertyPanel.locator('span.bg-yellow-100:has-text("内部")')).toBeVisible();

    // Test "public" level
    await secretLevelSelect.selectOption('public');
    await page.waitForTimeout(100);
    await expect(propertyPanel.locator('span.bg-green-100:has-text("公开")')).toBeVisible();
  });

  test('TC-2.1-7: Common header displays for all node types', async ({ page }) => {
    const rootNode = page.locator('.x6-node').first();
    await rootNode.click();
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
      await typeSelect.selectOption(type);
      await page.waitForTimeout(100);
      await expect(nodeTitle).toBeVisible();
      await expect(createdAt).toBeVisible();
      await expect(updatedAt).toBeVisible();
    }
  });
});
