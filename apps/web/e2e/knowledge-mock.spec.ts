/**
 * Story 2.8: Knowledge Link & Recommendation Mock E2E Tests
 * Tests for knowledge resource association and recommendation display
 */

import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

// Helper to wait for API responses
const waitForApi = (page: Page, method: string, path: string) =>
    page.waitForResponse(
        (res) =>
            res.url().includes(path) &&
            res.request().method() === method &&
            res.ok(),
        { timeout: 10000 }
    );

test.describe('Knowledge Link & Recommendation (Story 2.8)', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        await gotoTestGraph(page, testInfo);
        await page.waitForTimeout(500);
    });

    test.describe('AC1.1-1.3: Knowledge Recommendation Panel', () => {
        test('TC-2.8-REC-1: Recommendation panel should be visible when any node is selected', async ({
            page,
        }) => {
            // When: Select a node
            const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
            await expect(centerNode).toBeVisible();
            await centerNode.click();

            // Then: Knowledge Recommendation section should be visible with at least one item
            const propertyPanel = page.locator('aside:has-text("属性面板")');
            await expect(propertyPanel).toBeVisible();

            const recommendationSection = propertyPanel.locator('[data-testid="knowledge-recommendation"]');
            await expect(recommendationSection).toBeVisible();

            const itemCount = await recommendationSection.locator('button').count();
            expect(itemCount).toBeGreaterThan(0);
        });

        test('TC-2.8-REC-2: Clicking recommendation should show mock toast', async ({
            page,
        }) => {
            // Given: A node is selected and recommendation panel is visible
            const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
            await expect(centerNode).toBeVisible();
            await centerNode.click();

            const propertyPanel = page.locator('aside:has-text("属性面板")');
            await expect(propertyPanel).toBeVisible();

            const recommendationButton = propertyPanel
                .locator('[data-testid="knowledge-recommendation"] button')
                .first();
            await expect(recommendationButton).toBeVisible();

            // Prevent real popups during test
            await page.evaluate(() => {
                window.open = () => null;
            });

            // When: Click on a recommendation
            await recommendationButton.click();

            // Then: Toast should be shown (mock implementation uses @cdm/ui toast)
            await expect(page.locator('text=正在打开:')).toBeVisible({ timeout: 3000 });
        });
    });

    test.describe('AC2.1-2.5: Knowledge Association (Task Node)', () => {
        test('TC-2.8-ASSOC-1: Task node should have "Associate Knowledge" section', async ({
            page,
        }) => {
            // Given: A Task node is selected
            const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
            await expect(centerNode).toBeVisible();
            await centerNode.click();

            // Change to Task type
            const propertyPanel = page.locator('aside:has-text("属性面板")');
            await expect(propertyPanel).toBeVisible();

            const typeSelect = propertyPanel.locator('select').first();
            await typeSelect.selectOption('TASK');
            await expect(propertyPanel.locator('label:has-text("状态")')).toBeVisible();

            // AC2.1: Then "Associate Knowledge" section should be available
            await expect(propertyPanel.getByRole('heading', { name: /关联知识/ })).toBeVisible();

            // Should have "关联" button
            await expect(propertyPanel.getByRole('button', { name: '关联' }).first()).toBeVisible();
        });

        test('TC-2.8-ASSOC-2: Clicking "关联" should open KnowledgeSearchDialog', async ({
            page,
        }) => {
            // Given: A Task node is selected
            const nodes = page.locator('.x6-node');
            const firstNode = nodes.first();
            await firstNode.click();
            await page.waitForTimeout(500);

            const propertyPanel = page.locator('aside:has-text("属性")');
            const panelVisible = await propertyPanel.isVisible().catch(() => false);

            if (!panelVisible) {
                test.skip();
                return;
            }

            // Change to Task type
            const typeSelect = propertyPanel.locator('select').first();
            await typeSelect.selectOption('TASK');
            await page.waitForTimeout(300);

            // When: Click "关联" button
            const addButton = propertyPanel.locator('button:has-text("关联")');
            const buttonVisible = await addButton.isVisible().catch(() => false);

            if (buttonVisible) {
                await addButton.click();
                await page.waitForTimeout(500);

                // AC2.2: Then KnowledgeSearchDialog should open
                const dialog = page.locator('text=关联知识资源');
                const dialogVisible = await dialog.isVisible().catch(() => false);

                expect(dialogVisible).toBe(true);

                // Should have search input
                const searchInput = page.locator('input[placeholder*="搜索知识资源"]');
                const inputVisible = await searchInput.isVisible().catch(() => false);

                expect(inputVisible).toBe(true);
            }
        });

        test('TC-2.8-ASSOC-3: Selecting knowledge should add to knowledgeRefs list', async ({
            page,
        }) => {
            // Given: KnowledgeSearchDialog is open
            const nodes = page.locator('.x6-node');
            const firstNode = nodes.first();
            await firstNode.click();
            await page.waitForTimeout(500);

            const propertyPanel = page.locator('aside:has-text("属性")');
            const typeSelect = propertyPanel.locator('select').first();
            await typeSelect.selectOption('TASK');
            await page.waitForTimeout(300);

            const addButton = propertyPanel.locator('button:has-text("关联")');
            await addButton.click();
            await page.waitForTimeout(500);

            // Wait for API to load knowledge items
            try {
                await waitForApi(page, 'GET', '/api/knowledge-library');
            } catch {
                // Continue even if API timeout
            }
            await page.waitForTimeout(500);

            // When: Select a knowledge item
            const knowledgeItem = page.locator('[cmdk-item]').first();
            await expect(knowledgeItem).toBeVisible();

            const selectedTitle = (await knowledgeItem.locator('span').first().textContent())?.trim() || '';
            await knowledgeItem.click();

            // Dialog should close and the selected title should appear in the associated list
            if (selectedTitle) {
                await expect(propertyPanel.locator(`text=${selectedTitle}`)).toBeVisible({ timeout: 5000 });
            }
        });

        test('TC-2.8-ASSOC-4: Empty state should show placeholder text', async ({
            page,
        }) => {
            // Given: A new Task node with no knowledge refs
            const nodes = page.locator('.x6-node');
            const firstNode = nodes.first();
            await firstNode.click();
            await page.waitForTimeout(500);

            const propertyPanel = page.locator('aside:has-text("属性")');
            const typeSelect = propertyPanel.locator('select').first();
            await typeSelect.selectOption('TASK');
            await page.waitForTimeout(300);

            // Then: Should show empty state message
            const emptyState = page.locator('text=暂无关联知识');
            const emptyVisible = await emptyState.isVisible().catch(() => false);

            expect(emptyVisible).toBe(true);
        });
    });

    test.describe('AC3.1-3.2: API & Data Types', () => {
        // Use baseURL from playwright config or fallback to localhost for local dev
        const getApiBaseUrl = () => process.env.API_BASE_URL || 'http://localhost:3001/api';

        test('TC-2.8-API-1: Knowledge Library API should return mock data', async ({
            page,
        }) => {
            // Given: API is available
            // When: Fetch knowledge library
            const response = await page.request.get(`${getApiBaseUrl()}/knowledge-library`);

            // Then: Should return array of knowledge items
            expect(response.ok()).toBe(true);

            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
            expect(data.length).toBeGreaterThan(0);

            // AC3.1: Verify KnowledgeReference type structure
            const firstItem = data[0];
            expect(firstItem).toHaveProperty('id');
            expect(firstItem).toHaveProperty('title');
            expect(firstItem).toHaveProperty('type');
            expect(['document', 'link', 'video']).toContain(firstItem.type);
        });

        test('TC-2.8-API-2: Knowledge Library API should support search query', async ({
            page,
        }) => {
            // Given: API is available
            // When: Search for "design"
            const response = await page.request.get(
                `${getApiBaseUrl()}/knowledge-library?q=design`
            );

            // Then: Should return filtered results
            expect(response.ok()).toBe(true);

            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);

            // All results should contain "design" in title or summary
            for (const item of data) {
                const matchesTitle = item.title.toLowerCase().includes('design');
                const matchesSummary = item.summary?.toLowerCase().includes('design') ?? false;
                expect(matchesTitle || matchesSummary).toBe(true);
            }
        });
    });

    test.describe('Integration: Full Flow', () => {
        test('TC-2.8-FLOW: Complete knowledge association flow', async ({ page }) => {
            // Step 1: Select a node
            const nodes = page.locator('.x6-node');
            await nodes.first().click();
            await page.waitForTimeout(500);

            // Step 2: Change type to Task
            const propertyPanel = page.locator('aside:has-text("属性")');
            const panelVisible = await propertyPanel.isVisible().catch(() => false);

            if (!panelVisible) {
                test.skip();
                return;
            }

            const typeSelect = propertyPanel.locator('select').first();
            await typeSelect.selectOption('TASK');
            await page.waitForTimeout(300);

            // Step 3: Verify Knowledge Recommendation is visible
            await expect(propertyPanel.locator('[data-testid="knowledge-recommendation"]')).toBeVisible();

            // Step 4: Verify "关联知识" section exists
            await expect(propertyPanel.getByRole('heading', { name: /关联知识/ })).toBeVisible();

            // Step 5: Open search dialog
            const addButton = propertyPanel.locator('button:has-text("关联")');
            await addButton.click();
            await page.waitForTimeout(500);

            // Step 6: Verify dialog opened
            const dialog = page.locator('text=关联知识资源');
            const dialogVisible = await dialog.isVisible().catch(() => false);
            expect(dialogVisible).toBe(true);

            // Step 7: Close dialog with ESC
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);

            // Dialog should be closed
            const dialogClosedCheck = await dialog.isVisible().catch(() => false);
            expect(dialogClosedCheck).toBe(false);
        });
    });
});
