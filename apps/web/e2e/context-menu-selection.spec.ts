import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

type ExposedGraphCell = { isNode: () => boolean };
type ExposedGraph = { getSelectedCells: () => ExposedGraphCell[] };

async function selectCenterNode(page: Page) {
  const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
  await expect(centerNode).toBeVisible();
  await centerNode.click();
}

async function getSelectedNodeCount(page: Page) {
  return page.evaluate(() => {
    const graph = (window as unknown as { __cdmGraph?: ExposedGraph }).__cdmGraph;
    if (!graph) return 0;
    return graph.getSelectedCells().filter((c) => c.isNode()).length;
  });
}

test.describe('Context Menu keeps selection', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await gotoTestGraph(page, testInfo);
  });

  test('Right-click on selected node keeps selection and menu items', async ({ page }) => {
    await selectCenterNode(page);

    const before = await getSelectedNodeCount(page);
    expect(before).toBeGreaterThan(0);

    await page.locator('.x6-node[data-cell-id="center-node"]').click({ button: 'right' });

    const pasteItem = page.locator('button:has-text("粘贴到此处")');
    await expect(pasteItem).toBeVisible();

    const copyItem = page.locator('button:has-text("复制")');
    await expect(copyItem).toBeVisible();
    await page.waitForTimeout(200);
    await expect(copyItem).toBeVisible();

    const after = await getSelectedNodeCount(page);
    expect(after).toBe(before);
  });
});
