import { test, expect, type Page, type Request } from '@playwright/test';
import { gotoTestGraph } from './testUtils';

type UpdateNodePropertiesRequestBody = {
  type: string;
  props?: Record<string, unknown>;
};

async function clickCanvasNodeByLabel(page: Page, label: string) {
  const node = page.locator('.x6-node', { hasText: label }).first();
  await expect(node).toBeVisible({ timeout: 15000 });
  await node.click();
}

test.describe('Clipboard Data Props Sanitization', () => {
  test.beforeEach(async ({ page, context }, testInfo) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await gotoTestGraph(page, testInfo);
  });

  test('Paste DATA node drops invalid props and updateNodeProps payload is clean', async ({ page }) => {

    const clipboardPayload = {
      version: '1.0',
      source: 'cdm-17',
      timestamp: Date.now(),
      sourceGraphId: 'graph-1',
      nodes: [
        {
          originalId: 'node-1',
          label: 'Clipboard Data Node',
          type: 'DATA',
          x: 0,
          y: 0,
          width: 220,
          height: 40,
          metadata: {
            dataType: 'document',
            version: 'v1.0.1',
            secretLevel: 'internal',
            storagePath: null,
            code: null,
            ownerId: null,
          },
          tags: [],
        },
      ],
      edges: [],
      layout: { minX: 0, minY: 0, width: 0, height: 0, center: { x: 0, y: 0 } },
    };

    await page.evaluate(async (payload) => {
      await navigator.clipboard.writeText(JSON.stringify(payload));
    }, clipboardPayload);

    let updatePayload: UpdateNodePropertiesRequestBody | null = null;
    page.on('request', (req: Request) => {
      if (req.method() === 'PATCH' && req.url().includes('/api/nodes/') && req.url().endsWith('/properties')) {
        try {
          updatePayload = JSON.parse(req.postData() || '{}') as UpdateNodePropertiesRequestBody;
        } catch {
          updatePayload = null;
        }
      }
    });

    const responsePromise = page.waitForResponse((res) => {
      if (!(res.url().includes('/api/nodes/') && res.url().endsWith('/properties'))) return false;
      if (res.request().method() !== 'PATCH') return false;
      const postData = res.request().postData();
      if (!postData) return false;
      try {
        const body = JSON.parse(postData);
        return body.type === 'DATA';
      } catch {
        return false;
      }
    });

    await page.getByRole('button', { name: /粘贴/ }).click();

    // Select the pasted node to trigger persistence
    await page.keyboard.press('Escape');
    await clickCanvasNodeByLabel(page, 'Clipboard Data Node');

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    expect(updatePayload).toBeTruthy();
    expect(updatePayload.type).toBe('DATA');
    expect(updatePayload.props).toEqual({
      dataType: 'document',
      version: 'v1.0.1',
      secretLevel: 'internal',
      storagePath: null,
    });
  });

  test('Paste TASK node drops invalid props and updateNodeProps payload is clean', async ({ page }) => {
    const clipboardPayload = {
      version: '1.0',
      source: 'cdm-17',
      timestamp: Date.now(),
      sourceGraphId: 'graph-1',
      nodes: [
        {
          originalId: 'task-1',
          label: 'Clipboard Task Node',
          type: 'TASK',
          x: 0,
          y: 0,
          width: 220,
          height: 40,
          metadata: {
            status: 'todo',
            assigneeId: 'user-1',
            priority: 'high',
            dataType: 'document',
            code: 'PBS-001',
          },
          tags: [],
        },
      ],
      edges: [],
      layout: { minX: 0, minY: 0, width: 0, height: 0, center: { x: 0, y: 0 } },
    };

    await page.evaluate(async (payload) => {
      await navigator.clipboard.writeText(JSON.stringify(payload));
    }, clipboardPayload);

    let updatePayload: UpdateNodePropertiesRequestBody | null = null;
    page.on('request', (req: Request) => {
      if (req.method() === 'PATCH' && req.url().includes('/api/nodes/') && req.url().endsWith('/properties')) {
        try {
          updatePayload = JSON.parse(req.postData() || '{}') as UpdateNodePropertiesRequestBody;
        } catch {
          updatePayload = null;
        }
      }
    });

    const responsePromise = page.waitForResponse((res) => {
      if (!(res.url().includes('/api/nodes/') && res.url().endsWith('/properties'))) return false;
      if (res.request().method() !== 'PATCH') return false;
      const postData = res.request().postData();
      if (!postData) return false;
      try {
        const body = JSON.parse(postData);
        return body.type === 'TASK';
      } catch {
        return false;
      }
    });

    await page.getByRole('button', { name: /粘贴/ }).click();

    await page.keyboard.press('Escape');
    await clickCanvasNodeByLabel(page, 'Clipboard Task Node');

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    expect(updatePayload).toBeTruthy();
    expect(updatePayload.type).toBe('TASK');
    expect(updatePayload.props).toEqual({
      status: 'todo',
      assigneeId: 'user-1',
      priority: 'high',
    });
  });

  test('Paste REQUIREMENT node drops invalid props and updateNodeProps payload is clean', async ({ page }) => {
    const clipboardPayload = {
      version: '1.0',
      source: 'cdm-17',
      timestamp: Date.now(),
      sourceGraphId: 'graph-1',
      nodes: [
        {
          originalId: 'req-1',
          label: 'Clipboard Requirement Node',
          type: 'REQUIREMENT',
          x: 0,
          y: 0,
          width: 220,
          height: 40,
          metadata: {
            reqType: 'functional',
            acceptanceCriteria: 'AC text',
            priority: 'must',
            secretLevel: 'internal',
          },
          tags: [],
        },
      ],
      edges: [],
      layout: { minX: 0, minY: 0, width: 0, height: 0, center: { x: 0, y: 0 } },
    };

    await page.evaluate(async (payload) => {
      await navigator.clipboard.writeText(JSON.stringify(payload));
    }, clipboardPayload);

    let updatePayload: UpdateNodePropertiesRequestBody | null = null;
    page.on('request', (req: Request) => {
      if (req.method() === 'PATCH' && req.url().includes('/api/nodes/') && req.url().endsWith('/properties')) {
        try {
          updatePayload = JSON.parse(req.postData() || '{}') as UpdateNodePropertiesRequestBody;
        } catch {
          updatePayload = null;
        }
      }
    });

    const responsePromise = page.waitForResponse((res) => {
      if (!(res.url().includes('/api/nodes/') && res.url().endsWith('/properties'))) return false;
      if (res.request().method() !== 'PATCH') return false;
      const postData = res.request().postData();
      if (!postData) return false;
      try {
        const body = JSON.parse(postData);
        return body.type === 'REQUIREMENT';
      } catch {
        return false;
      }
    });

    await page.getByRole('button', { name: /粘贴/ }).click();

    await page.keyboard.press('Escape');
    await clickCanvasNodeByLabel(page, 'Clipboard Requirement Node');

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    expect(updatePayload).toBeTruthy();
    expect(updatePayload.type).toBe('REQUIREMENT');
    expect(updatePayload.props).toEqual({
      reqType: 'functional',
      acceptanceCriteria: 'AC text',
      priority: 'must',
    });
  });

  test('Paste PBS node drops invalid props and updateNodeProps payload is clean', async ({ page }) => {
    const clipboardPayload = {
      version: '1.0',
      source: 'cdm-17',
      timestamp: Date.now(),
      sourceGraphId: 'graph-1',
      nodes: [
        {
          originalId: 'pbs-1',
          label: 'Clipboard PBS Node',
          type: 'PBS',
          x: 0,
          y: 0,
          width: 220,
          height: 40,
          metadata: {
            code: 'PBS-001',
            version: 'v1.0.0',
            ownerId: 'owner-1',
            indicators: [{ id: 'i1', name: 'Mass', targetValue: '10' }],
            productRef: { productId: 'p1', productName: 'Engine' },
            dataType: 'document',
            priority: 'high',
          },
          tags: [],
        },
      ],
      edges: [],
      layout: { minX: 0, minY: 0, width: 0, height: 0, center: { x: 0, y: 0 } },
    };

    await page.evaluate(async (payload) => {
      await navigator.clipboard.writeText(JSON.stringify(payload));
    }, clipboardPayload);

    let updatePayload: UpdateNodePropertiesRequestBody | null = null;
    page.on('request', (req: Request) => {
      if (req.method() === 'PATCH' && req.url().includes('/api/nodes/') && req.url().endsWith('/properties')) {
        try {
          updatePayload = JSON.parse(req.postData() || '{}') as UpdateNodePropertiesRequestBody;
        } catch {
          updatePayload = null;
        }
      }
    });

    const responsePromise = page.waitForResponse((res) => {
      if (!(res.url().includes('/api/nodes/') && res.url().endsWith('/properties'))) return false;
      if (res.request().method() !== 'PATCH') return false;
      const postData = res.request().postData();
      if (!postData) return false;
      try {
        const body = JSON.parse(postData);
        return body.type === 'PBS';
      } catch {
        return false;
      }
    });

    await page.getByRole('button', { name: /粘贴/ }).click();

    await page.keyboard.press('Escape');
    await clickCanvasNodeByLabel(page, 'Clipboard PBS Node');

    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    expect(updatePayload).toBeTruthy();
    expect(updatePayload.type).toBe('PBS');
    expect(updatePayload.props).toEqual({
      code: 'PBS-001',
      version: 'v1.0.0',
      ownerId: 'owner-1',
      indicators: [{ id: 'i1', name: 'Mass', targetValue: '10' }],
      productRef: { productId: 'p1', productName: 'Engine' },
    });
  });
});
