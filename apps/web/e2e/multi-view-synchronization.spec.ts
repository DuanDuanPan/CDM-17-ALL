import { test, expect, type Page } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

type GanttApi = {
  getTask?: (id: string) => { id: string; start_date: unknown; end_date: unknown } | null;
  showTask?: (id: string) => void;
  updateTask?: (id: string) => void;
  callEvent?: (name: string, args: unknown[]) => void;
  date?: { add: (date: unknown, value: number, unit: string) => unknown };
};

type WindowWithGantt = Window & { gantt?: GanttApi };

const openPropertyPanelForNode = async (page: Page, nodeId: string) => {
  const node = page.locator(`.x6-node[data-cell-id="${nodeId}"]`);
  await expect(node).toBeVisible();
  await node.click();
  await page.waitForSelector('aside:has-text("属性面板")');
};

const setSelectedNodeTypeToTask = async (page: Page) => {
  const typeSelect = page.locator('aside:has-text("属性面板") select').first();
  await expect(typeSelect).toBeVisible();
  await typeSelect.selectOption('TASK');
  await page.waitForSelector('label:has-text("状态")');
};

const createTaskNode = async (page: Page, label: string) => {
  const centerNode = page.locator('.x6-node[data-cell-id="center-node"]');
  await expect(centerNode).toBeVisible();
  await centerNode.click();
  await page.keyboard.press('Tab');

  const editInput = page.locator('#graph-container input[placeholder="New Topic"]').first();
  await expect(editInput).toBeVisible();
  await editInput.fill(label);
  await editInput.press('Enter');

  const newNode = page.locator('.x6-node', { hasText: label }).first();
  await expect(newNode).toBeVisible();

  const nodeId = await newNode.getAttribute('data-cell-id');
  if (!nodeId) {
    throw new Error(`Failed to resolve node id for created task: ${label}`);
  }

  await openPropertyPanelForNode(page, nodeId);
  await setSelectedNodeTypeToTask(page);
  return nodeId;
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

const getGanttTaskLocator = async (page: Page, taskId?: string) => {
  const selector = taskId
    ? `.gantt_task_line[data-task-id="${taskId}"], .gantt_task_line[task_id="${taskId}"]`
    : '.gantt_task_line';

  const inPage = page.locator(selector);
  if (await inPage.count()) return inPage;

  const iframe = page.locator('[data-testid="gantt-container"] iframe').first();
  if (await iframe.count()) {
    return page.frameLocator('[data-testid="gantt-container"] iframe').locator(selector);
  }

  return inPage;
};

const ensureGanttTaskInView = async (page: Page, taskId: string) => {
  await page.waitForFunction((id) => {
    const gantt = (window as unknown as WindowWithGantt).gantt;
    if (!gantt?.getTask) return false;
    try {
      return Boolean(gantt.getTask(id));
    } catch {
      return false;
    }
  }, taskId);
  await page.evaluate((id) => {
    const gantt = (window as unknown as WindowWithGantt).gantt;
    if (gantt?.showTask) {
      gantt.showTask(id);
    }
  }, taskId);
};

test.describe('Multi-View Synchronization', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await gotoTestGraph(page, testInfo);
    await page.waitForSelector('[data-testid="view-switcher"]');
    await page.evaluate(() => localStorage.clear());
  });

  test('Kanban drag updates status and syncs back to Mindmap', async ({ page }) => {
    const taskId = await createTaskNode(page, 'Kanban Sync Task');

    // Switch to Kanban view
    await page.locator('[data-testid="view-kanban"]').click();
    await page.waitForSelector('[data-testid="kanban-dropzone-todo"]');

    const cardTestId = `kanban-card-${taskId}`;
    const card = page.locator(`[data-testid="${cardTestId}"]`);
    await expect(card).toBeVisible();

    // Drag card to Done column (dnd-kit uses pointer events)
    await dragKanbanCardToColumn(page, cardTestId, 'kanban-dropzone-done');

    // Verify card now appears in done column
    const doneColumnCard = page.locator(
      `[data-testid="kanban-column-done"] [data-testid="${cardTestId}"]`
    );
    await expect(doneColumnCard).toBeVisible({ timeout: 10000 });

    // Switch back to Graph view and verify status
    await page.locator('[data-testid="view-graph"]').click();
    await page.waitForSelector('#graph-container');
    await openPropertyPanelForNode(page, taskId);
    const statusSelect = page
      .locator('label:has-text("状态")')
      .first()
      .locator('..')
      .locator('select');
    await expect(statusSelect).toHaveValue('done');
  });

  test('Gantt drag updates dates and syncs back to Mindmap', async ({ page }) => {
    const taskId = await createTaskNode(page, 'Gantt Date Sync Task');

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
    const taskBar = (await getGanttTaskLocator(page, taskId)).first();
    await ensureGanttTaskInView(page, taskId);
    await taskBar.scrollIntoViewIfNeeded();

    const originalValue = await dueDateInput.inputValue();

    // Simulate drag via gantt API to avoid flaky pointer interactions in CI
    await page.evaluate((id) => {
      const gantt = (window as unknown as WindowWithGantt).gantt;
      if (!gantt?.getTask || !gantt?.date || !gantt?.callEvent) return;
      const task = gantt.getTask?.(id);
      if (!task) return;
      const newStart = gantt.date.add(task.start_date, 2, 'day');
      const newEnd = gantt.date.add(task.end_date, 2, 'day');
      task.start_date = newStart;
      task.end_date = newEnd;
      gantt.updateTask?.(task.id);
      gantt.callEvent('onAfterTaskDrag', [task.id, 'move']);
    }, taskId);

    await expect(dueDateInput).not.toHaveValue(originalValue);
  });

  test('Cross-view sync keeps status consistent across Kanban and Gantt', async ({ page }) => {
    const taskId = await createTaskNode(page, 'Cross View Sync Task');
    const dueDateInput = page
      .locator('label:has-text("截止时间")')
      .first()
      .locator('..')
      .locator('input[type="date"]');
    await dueDateInput.fill('2025-01-05');

    // Switch to Kanban and drag to done
    await page.locator('[data-testid="view-kanban"]').click();
    await page.waitForSelector('[data-testid="kanban-dropzone-todo"]');
    await dragKanbanCardToColumn(page, `kanban-card-${taskId}`, 'kanban-dropzone-done');

    // Switch to Gantt and confirm status in panel
    await page.locator('[data-testid="view-gantt"]').click();
    await page.waitForSelector('[data-testid="gantt-container"]');
    const taskBar = (await getGanttTaskLocator(page, taskId)).first();
    await ensureGanttTaskInView(page, taskId);
    await taskBar.scrollIntoViewIfNeeded();

    const statusSelect = page
      .locator('label:has-text("状态")')
      .first()
      .locator('..')
      .locator('select');
    await expect(statusSelect).toHaveValue('done');
  });
});
