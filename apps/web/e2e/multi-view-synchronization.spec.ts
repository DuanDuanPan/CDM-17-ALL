import { test, expect, type Page } from '@playwright/test';

const openPropertyPanelForRoot = async (page: Page) => {
  await page.waitForSelector('.x6-node');
  const rootNode = page.locator('.x6-node').first();
  await expect(rootNode).toBeVisible();
  await rootNode.click();
  await page.waitForSelector('aside:has-text("属性面板")');
};

const setNodeTypeToTask = async (page: Page) => {
  const typeSelect = page
    .locator('label:has-text("节点类型")')
    .first()
    .locator('..')
    .locator('select');
  await expect(typeSelect).toBeVisible();
  await typeSelect.selectOption('TASK');
  await page.waitForSelector('label:has-text("状态")');
};

const dragKanbanCardToColumn = async (
  page: Page,
  cardTestId: string,
  dropzoneTestId: string
) => {
  const card = page.locator(`[data-testid="${cardTestId}"]`);
  const dropzone = page.locator(`[data-testid="${dropzoneTestId}"]`);

  await expect(card).toBeVisible();
  await expect(dropzone).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await dropzone.scrollIntoViewIfNeeded();

  const cardBox = await card.boundingBox();
  const dropBox = await dropzone.boundingBox();

  if (!cardBox || !dropBox) {
    throw new Error('Unable to resolve drag/drop coordinates for Kanban');
  }

  const startX = cardBox.x + cardBox.width / 2;
  const startY = cardBox.y + cardBox.height / 2;
  const endX = dropBox.x + dropBox.width / 2;
  const endY = dropBox.y + dropBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(150);
};

const getGanttTaskLocator = async (page: Page) => {
  const frameCount = await page
    .locator('[data-testid="gantt-container"] iframe')
    .count();

  if (frameCount > 0) {
    return page
      .frameLocator('[data-testid="gantt-container"] iframe')
      .locator('.gantt_task_line');
  }

  return page.locator('.gantt_task_line');
};

const ensureGanttTaskInView = async (page: Page, taskId: string) => {
  await page.waitForFunction((id) => {
    const gantt = (window as any).gantt;
    if (!gantt?.getTask) return false;
    try {
      return Boolean(gantt.getTask(id));
    } catch {
      return false;
    }
  }, taskId);
  await page.evaluate((id) => {
    const gantt = (window as any).gantt;
    if (gantt?.showTask) {
      gantt.showTask(id);
    }
  }, taskId);
};

test.describe('Multi-View Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#graph-container');
    await page.waitForSelector('[data-testid="view-switcher"]');
    await page.evaluate(() => localStorage.clear());
  });

  test('Kanban drag updates status and syncs back to Mindmap', async ({ page }) => {
    await openPropertyPanelForRoot(page);
    await setNodeTypeToTask(page);

    // Switch to Kanban view
    await page.locator('[data-testid="view-kanban"]').click();
    await page.waitForSelector('[data-testid="kanban-dropzone-todo"]');

    const card = page.locator('[data-testid="kanban-card-center-node"]');
    await expect(card).toBeVisible();

    // Drag card to Done column (dnd-kit uses pointer events)
    await dragKanbanCardToColumn(page, 'kanban-card-center-node', 'kanban-dropzone-done');

    // Verify card now appears in done column
    const doneColumnCard = page.locator(
      '[data-testid="kanban-column-done"] [data-testid="kanban-card-center-node"]'
    );
    await expect(doneColumnCard).toBeVisible({ timeout: 10000 });

    // Switch back to Graph view and verify status
    await page.locator('[data-testid="view-graph"]').click();
    await page.waitForSelector('#graph-container');
    await openPropertyPanelForRoot(page);
    const statusSelect = page
      .locator('label:has-text("状态")')
      .first()
      .locator('..')
      .locator('select');
    await expect(statusSelect).toHaveValue('done');
  });

  test('Gantt drag updates dates and syncs back to Mindmap', async ({ page }) => {
    await openPropertyPanelForRoot(page);
    await setNodeTypeToTask(page);

    const dueDateInput = page
      .locator('label:has-text("截止时间")')
      .first()
      .locator('..')
      .locator('input[type="date"]');
    await dueDateInput.fill('2025-01-05');
    await expect(dueDateInput).toHaveValue('2025-01-05');

    // Switch to Gantt view
    await page.locator('[data-testid="view-gantt"]').click();
    await page.waitForSelector('[data-testid="gantt-container"]');
    const taskLines = await getGanttTaskLocator(page);
    const taskBar = taskLines.first();
    await ensureGanttTaskInView(page, 'center-node');
    await taskBar.scrollIntoViewIfNeeded();

    const originalValue = await dueDateInput.inputValue();

    // Simulate drag via gantt API to avoid flaky pointer interactions in CI
    await page.evaluate(() => {
      const gantt = (window as any).gantt;
      if (!gantt?.getTask || !gantt?.date || !gantt?.callEvent) return;
      const task = gantt.getTask('center-node');
      if (!task) return;
      const newStart = gantt.date.add(task.start_date, 2, 'day');
      const newEnd = gantt.date.add(task.end_date, 2, 'day');
      task.start_date = newStart;
      task.end_date = newEnd;
      gantt.updateTask(task.id);
      gantt.callEvent('onAfterTaskDrag', [task.id, 'move']);
    });

    await expect(dueDateInput).not.toHaveValue(originalValue);
  });

  test('Cross-view sync keeps status consistent across Kanban and Gantt', async ({ page }) => {
    await openPropertyPanelForRoot(page);
    await setNodeTypeToTask(page);

    // Switch to Kanban and drag to done
    await page.locator('[data-testid="view-kanban"]').click();
    await page.waitForSelector('[data-testid="kanban-dropzone-todo"]');
    await dragKanbanCardToColumn(page, 'kanban-card-center-node', 'kanban-dropzone-done');

    // Switch to Gantt and confirm status in panel
    await page.locator('[data-testid="view-gantt"]').click();
    await page.waitForSelector('[data-testid="gantt-container"]');
    const taskLines = await getGanttTaskLocator(page);
    await ensureGanttTaskInView(page, 'center-node');
    await taskLines.first().scrollIntoViewIfNeeded();

    const statusSelect = page
      .locator('label:has-text("状态")')
      .first()
      .locator('..')
      .locator('select');
    await expect(statusSelect).toHaveValue('done');
  });
});
