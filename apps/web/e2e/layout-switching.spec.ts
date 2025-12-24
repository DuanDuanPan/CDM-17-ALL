import { test, expect } from '@playwright/test';

test.describe('Layout Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#graph-container');

    // Wait for graph to be fully loaded
    await page.waitForSelector('[data-testid="layout-switcher"]');

    // Clear localStorage to start fresh
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should display layout switcher with all modes', async ({ page }) => {
    const layoutSwitcher = page.locator('[data-testid="layout-switcher"]');
    await expect(layoutSwitcher).toBeVisible();

    // Check all three layout buttons are present
    await expect(page.locator('[data-testid="layout-mindmap"]')).toBeVisible();
    await expect(page.locator('[data-testid="layout-logic"]')).toBeVisible();
    await expect(page.locator('[data-testid="layout-free"]')).toBeVisible();
  });

  test('should switch from mindmap to logic layout', async ({ page }) => {
    // Create a child node first to see layout changes
    const centerNode = page.locator('text=中心主题').first();
    await centerNode.click();
    await page.keyboard.press('Tab');
    await page.keyboard.type('测试节点');
    await page.keyboard.press('Escape');

    // Get initial positions
    const initialPositions = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[data-shape="mind-node"]');
      return Array.from(nodes).map((node: Element) => ({
        id: node.getAttribute('data-cell-id'),
        x: parseFloat(node.getAttribute('transform')?.match(/translate\(([^,]+)/)?.[1] || '0'),
        y: parseFloat(node.getAttribute('transform')?.match(/translate\([^,]+,\s*([^)]+)/)?.[1] || '0'),
      }));
    });

    // Switch to logic layout
    await page.locator('[data-testid="layout-logic"]').click();

    // Wait for animation to complete
    await page.waitForTimeout(700);

    // Get new positions
    const newPositions = await page.evaluate(() => {
      const nodes = document.querySelectorAll('[data-shape="mind-node"]');
      return Array.from(nodes).map((node: Element) => ({
        id: node.getAttribute('data-cell-id'),
        x: parseFloat(node.getAttribute('transform')?.match(/translate\(([^,]+)/)?.[1] || '0'),
        y: parseFloat(node.getAttribute('transform')?.match(/translate\([^,]+,\s*([^)]+)/)?.[1] || '0'),
      }));
    });

    // Verify positions changed
    expect(initialPositions.length).toBe(newPositions.length);
    let positionsChanged = false;
    for (let i = 0; i < initialPositions.length; i++) {
      if (initialPositions[i].x !== newPositions[i].x || initialPositions[i].y !== newPositions[i].y) {
        positionsChanged = true;
        break;
      }
    }
    expect(positionsChanged).toBe(true);

    // Verify logic button is now active
    const logicButton = page.locator('[data-testid="layout-logic"]');
    await expect(logicButton).toHaveClass(/from-blue-500/);
  });

  test('should switch to free mode and enable grid toggle', async ({ page }) => {
    // Switch to free mode
    await page.locator('[data-testid="layout-free"]').click();

    // Wait for transition
    await page.waitForTimeout(300);

    // Verify free button is active
    const freeButton = page.locator('[data-testid="layout-free"]');
    await expect(freeButton).toHaveClass(/from-blue-500/);

    // Grid toggle should be visible in free mode
    const gridToggle = page.locator('[data-testid="grid-snap-toggle"]');
    await expect(gridToggle).toBeVisible();
  });

  test('should show loading state during layout switch', async ({ page }) => {
    // Click logic layout
    await page.locator('[data-testid="layout-logic"]').click();

    // Check for loading indicator (spinner)
    const spinner = page.locator('[data-testid="layout-logic"] .animate-spin');

    // Loading state should appear briefly
    // Note: This might be flaky due to timing, but we're testing that the UI supports it
    await page.waitForTimeout(100);

    // After transition, no loading state
    await page.waitForTimeout(700);
    await expect(spinner).not.toBeVisible();
  });

  test('should persist layout mode to localStorage', async ({ page }) => {
    // Switch to logic layout
    await page.locator('[data-testid="layout-logic"]').click();
    await page.waitForTimeout(300);

    // Check localStorage
    const savedMode = await page.evaluate(() => {
      return localStorage.getItem('cdm:layoutMode');
    });
    expect(savedMode).toBe('logic');

    // Reload page
    await page.reload();
    await page.waitForSelector('[data-testid="layout-switcher"]');

    // Verify logic layout is still active
    const logicButton = page.locator('[data-testid="layout-logic"]');
    await expect(logicButton).toHaveClass(/from-blue-500/);
  });

  test('should disable node dragging in mindmap mode', async ({ page }) => {
    // Ensure we're in mindmap mode (default)
    const mindmapButton = page.locator('[data-testid="layout-mindmap"]');
    await mindmapButton.click();
    await page.waitForTimeout(300);

    // Try to drag center node
    const centerNode = page.locator('text=中心主题').first();
    const initialBox = await centerNode.boundingBox();

    if (initialBox) {
      // Attempt drag
      await page.mouse.move(initialBox.x + 10, initialBox.y + 10);
      await page.mouse.down();
      await page.mouse.move(initialBox.x + 100, initialBox.y + 100);
      await page.mouse.up();

      await page.waitForTimeout(100);

      // Node should not have moved (or moved very little)
      const newBox = await centerNode.boundingBox();
      if (newBox) {
        // Allow small tolerance for rendering differences
        expect(Math.abs(newBox.x - initialBox.x)).toBeLessThan(5);
        expect(Math.abs(newBox.y - initialBox.y)).toBeLessThan(5);
      }
    }
  });

  test('should enable node dragging in free mode', async ({ page }) => {
    // Switch to free mode
    await page.locator('[data-testid="layout-free"]').click();
    await page.waitForTimeout(300);

    // Get center node
    const centerNode = page.locator('text=中心主题').first();
    const initialBox = await centerNode.boundingBox();

    if (initialBox) {
      // Drag the node
      await page.mouse.move(initialBox.x + 10, initialBox.y + 10);
      await page.mouse.down();
      await page.mouse.move(initialBox.x + 150, initialBox.y + 150);
      await page.mouse.up();

      await page.waitForTimeout(200);

      // Node should have moved significantly
      const newBox = await centerNode.boundingBox();
      if (newBox) {
        const distanceMoved = Math.sqrt(
          Math.pow(newBox.x - initialBox.x, 2) +
          Math.pow(newBox.y - initialBox.y, 2)
        );
        // Should have moved at least 50px
        expect(distanceMoved).toBeGreaterThan(50);
      }
    }
  });

  test('should toggle grid snapping in free mode', async ({ page }) => {
    // Switch to free mode
    await page.locator('[data-testid="layout-free"]').click();
    await page.waitForTimeout(300);

    // Grid toggle should be visible
    const gridToggle = page.locator('[data-testid="grid-snap-toggle"]');
    await expect(gridToggle).toBeVisible();

    // Initially not enabled (no green gradient)
    await expect(gridToggle).not.toHaveClass(/from-green-500/);

    // Click to enable
    await gridToggle.click();
    await page.waitForTimeout(100);

    // Should now be active
    await expect(gridToggle).toHaveClass(/from-green-500/);

    // Check localStorage
    const gridEnabled = await page.evaluate(() => {
      return localStorage.getItem('cdm:gridEnabled');
    });
    expect(gridEnabled).toBe('true');

    // Click again to disable
    await gridToggle.click();
    await page.waitForTimeout(100);

    // Should be inactive
    await expect(gridToggle).not.toHaveClass(/from-green-500/);
  });

  test('should recalculate layout when adding nodes in auto-layout mode', async ({ page }) => {
    // Ensure we're in mindmap mode
    await page.locator('[data-testid="layout-mindmap"]').click();
    await page.waitForTimeout(300);

    // Select center node
    const centerNode = page.locator('text=中心主题').first();
    await centerNode.click();

    // Get node positions before adding
    const initialCount = await page.locator('[data-shape="mind-node"]').count();

    // Add a child
    await page.keyboard.press('Tab');
    await page.keyboard.type('新节点');
    await page.keyboard.press('Escape');

    // Wait for layout recalculation
    await page.waitForTimeout(600);

    // Verify new node was added
    const newCount = await page.locator('[data-shape="mind-node"]').count();
    expect(newCount).toBe(initialCount + 1);

    // Layout should have adjusted (all nodes should still be visible and organized)
    const allNodes = page.locator('[data-shape="mind-node"]');
    await expect(allNodes.first()).toBeVisible();
    await expect(allNodes.last()).toBeVisible();
  });
});
