/**
 * Story 5.1: Template Library E2E Tests
 * Tests for template browsing, selection, and instantiation
 * 
 * Prerequisites:
 * - Database seeded with template data (pnpm prisma db seed)
 * - API server running
 * - Web app running
 */

import { test, expect } from '@playwright/test';

test.describe('Template Library (Story 5.1)', () => {
    const userId = process.env.E2E_USER_ID || 'test1';

    test.beforeEach(async ({ page }) => {
        // Navigate to graphs list page
        await page.goto(`/graphs?userId=${userId}`);
        await page.waitForLoadState('networkidle');
    });

    test.describe('AC1: Template List Display', () => {
        test('TC-E2E-1.1: Template library dialog opens from graphs page', async ({ page }) => {
            // Given: User is on the graphs list page
            await expect(page.locator('h1')).toContainText('我的图谱');

            // When: User clicks "从模板创建" button
            const templateButton = page.getByRole('button', { name: /从模板创建/ });
            await expect(templateButton).toBeVisible();
            await templateButton.click();

            // Then: Dialog should open with template library
            await expect(page.getByText('模板库')).toBeVisible();
            await expect(page.getByPlaceholder('搜索模板名称或描述...')).toBeVisible();
        });

        test('TC-E2E-1.2: Template list shows available templates', async ({ page }) => {
            // Open template dialog
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            // Wait for templates to load
            await expect(page.getByText('加载中...')).not.toBeVisible({ timeout: 5000 });

            // Check if templates are displayed (seed data should include these)
            // At minimum check that some template cards are visible
            const templateCards = page.locator('button[class*="rounded-lg border-2"]');
            await expect(templateCards.first()).toBeVisible({ timeout: 5000 });
        });

        test('TC-E2E-2: Category filter buttons are displayed', async ({ page }) => {
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            // "全部" button should always be visible
            await expect(page.getByRole('button', { name: '全部' })).toBeVisible();
        });
    });

    test.describe('AC2: Template Preview', () => {
        test('TC-E2E-2.1: Clicking template shows selection state', async ({ page }) => {
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            // Wait for templates to load
            const templateCards = page.locator('button[class*="rounded-lg border-2"]');
            await templateCards.first().waitFor({ state: 'visible', timeout: 5000 });

            // When: Click on a template card
            await templateCards.first().click();
            await page.waitForTimeout(200);

            // Then: The card should show selected state (border-blue-500)
            await expect(templateCards.first()).toHaveClass(/border-blue-500/);
        });

        test('TC-E2E-2.2: Preview toggle button appears after selection', async ({ page }) => {
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            const templateCards = page.locator('button[class*="rounded-lg border-2"]');
            await templateCards.first().waitFor({ state: 'visible', timeout: 5000 });

            // Select a template
            await templateCards.first().click();
            await page.waitForTimeout(200);

            // Preview button should appear
            await expect(page.getByText('预览结构')).toBeVisible();
        });
    });

    test.describe('AC3: Template Instantiation', () => {
        test('TC-E2E-3.1: Confirm button is disabled without selection', async ({ page }) => {
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            // Confirm button should be disabled
            const confirmButton = page.getByRole('button', { name: /从模板创建/i }).last();
            await expect(confirmButton).toBeDisabled();
        });

        test('TC-E2E-3.2: Confirm button enables after template selection', async ({ page }) => {
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            const templateCards = page.locator('button[class*="rounded-lg border-2"]');
            await templateCards.first().waitFor({ state: 'visible', timeout: 5000 });

            // Select a template
            await templateCards.first().click();
            await page.waitForTimeout(200);

            // Confirm button should be enabled
            const confirmButton = page.getByRole('button', { name: /从模板创建/i }).last();
            await expect(confirmButton).toBeEnabled();
        });

        test('TC-E2E-1: Complete template creation flow', async ({ page }) => {
            // Open template dialog
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            // Wait for templates to load
            const templateCards = page.locator('button[class*="rounded-lg border-2"]');
            await templateCards.first().waitFor({ state: 'visible', timeout: 5000 });

            // Step 1: Select a template
            await templateCards.first().click();
            await page.waitForTimeout(200);

            // Step 2: Optionally enter custom name
            const nameInput = page.getByPlaceholder('图谱名称');
            await expect(nameInput).toBeVisible();

            // Step 3: Click confirm button
            const confirmButton = page.getByRole('button', { name: /从模板创建/i }).last();
            await expect(confirmButton).toBeEnabled();

            // Prepare to wait for navigation
            const navigationPromise = page.waitForURL(/\/graph\//, { timeout: 15000 });

            await confirmButton.click();

            // Step 4: Should navigate to new graph
            await navigationPromise;

            // Step 5: Verify we're on the graph page
            await expect(page.url()).toContain('/graph/');
            await expect(page.url()).toContain(`userId=${userId}`);
        });

        test('TC-E2E-3: New graph has nodes from template', async ({ page }) => {
            // Open template dialog
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            const templateCards = page.locator('button[class*="rounded-lg border-2"]');
            await templateCards.first().waitFor({ state: 'visible', timeout: 5000 });

            // Select and create
            await templateCards.first().click();
            await page.waitForTimeout(200);

            const confirmButton = page.getByRole('button', { name: /从模板创建/i }).last();
            await confirmButton.click();

            await page.waitForURL(/\/graph\//, { timeout: 15000 });

            // Wait for graph to render
            await page.waitForTimeout(2000);

            // Verify nodes are rendered (X6 nodes)
            const nodes = page.locator('.x6-node');
            await expect(nodes.first()).toBeVisible({ timeout: 10000 });

            // Should have at least one node (the root)
            const nodeCount = await nodes.count();
            expect(nodeCount).toBeGreaterThan(0);
        });
    });

    test.describe('Search and Filter', () => {
        test('TC-E2E-SEARCH-1: Search filters templates correctly', async ({ page }) => {
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            // Wait for initial load
            const templateCards = page.locator('button[class*="rounded-lg border-2"]');
            await templateCards.first().waitFor({ state: 'visible', timeout: 5000 });

            // Search for something specific
            const searchInput = page.getByPlaceholder('搜索模板名称或描述...');
            await searchInput.fill('敏捷');
            await page.waitForTimeout(500); // Wait for debounce

            // Results should be filtered (potentially fewer)
            const filteredCount = await templateCards.count();

            // If there's a matching template, it should be visible
            // If not, the list should be empty or showing "未找到"
            if (filteredCount > 0) {
                // At least one result should contain the search term
                await expect(page.locator('h3:has-text("敏捷")')).toBeVisible();
            }
        });
    });

    test.describe('API Contract Validation', () => {
        test('TC-E2E-API-1: Templates API returns valid data', async ({ page }) => {
            const response = await page.request.get('/api/templates');

            expect(response.ok()).toBe(true);

            const data = await response.json();

            // API returns templates array directly or in templates property
            const templates = Array.isArray(data) ? data : data.templates;
            expect(Array.isArray(templates)).toBe(true);

            if (templates.length > 0) {
                const template = templates[0];
                expect(template).toHaveProperty('id');
                expect(template).toHaveProperty('name');
                expect(template).toHaveProperty('defaultClassification');
            }
        });

        test('TC-E2E-API-2: Template detail API returns structure', async ({ page }) => {
            // First get list to find a template ID
            const listResponse = await page.request.get('/api/templates');
            const listData = await listResponse.json();
            const templates = Array.isArray(listData) ? listData : listData.templates;

            if (templates && templates.length > 0) {
                const templateId = templates[0].id;

                const detailResponse = await page.request.get(
                    `/api/templates/${templateId}`
                );

                expect(detailResponse.ok()).toBe(true);

                const detailData = await detailResponse.json();

                // API may return template directly or wrapped
                const template = detailData.template || detailData;
                expect(template).toHaveProperty('structure');
                expect(template.structure).toHaveProperty('rootNode');
            }
        });

        test('TC-E2E-API-3: Categories API returns valid data', async ({ page }) => {
            const response = await page.request.get('/api/templates/categories');

            expect(response.ok()).toBe(true);

            const data = await response.json();

            // API returns categories array directly or in categories property
            const categories = Array.isArray(data) ? data : data.categories;
            expect(Array.isArray(categories)).toBe(true);

            if (categories.length > 0) {
                const category = categories[0];
                expect(category).toHaveProperty('id');
                expect(category).toHaveProperty('name');
            }
        });

        test('TC-E2E-API-4: Instantiate API creates graph', async ({ page }) => {
            // Get a template ID first
            const listResponse = await page.request.get('/api/templates');
            const listData = await listResponse.json();
            const templates = Array.isArray(listData) ? listData : listData.templates;

            if (templates && templates.length > 0) {
                const templateId = templates[0].id;

                const instantiateResponse = await page.request.post(
                    `/api/templates/${templateId}/instantiate?userId=${userId}`,
                    {
                        data: { name: 'E2E Test Graph' },
                    }
                );

                expect(instantiateResponse.ok()).toBe(true);

                const result = await instantiateResponse.json();
                expect(result).toHaveProperty('graphId');
                expect(result).toHaveProperty('graphName');
                expect(result).toHaveProperty('nodeCount');
                expect(result.nodeCount).toBeGreaterThan(0);
            }
        });
    });

    test.describe('Dialog Behavior', () => {
        test('Cancel button closes dialog', async ({ page }) => {
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            // Verify dialog is open
            await expect(page.getByText('模板库')).toBeVisible();

            // Click cancel
            await page.getByRole('button', { name: '取消' }).click();

            // Dialog should close
            await expect(page.getByText('模板库')).not.toBeVisible();
        });

        test('Clicking backdrop closes dialog', async ({ page }) => {
            await page.getByRole('button', { name: /从模板创建/ }).click();
            await page.waitForTimeout(500);

            await expect(page.getByText('模板库')).toBeVisible();

            // Click on backdrop (the semi-transparent overlay)
            await page.locator('.bg-black\\/50').click({ position: { x: 10, y: 10 } });

            await expect(page.getByText('模板库')).not.toBeVisible();
        });
    });
});
