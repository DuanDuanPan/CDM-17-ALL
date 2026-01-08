import type { Page, TestInfo } from '@playwright/test';

export const DEFAULT_E2E_USER_ID = 'test-e2e-user';

function toSafeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export function makeTestGraphUrl(graphId: string, userId: string = DEFAULT_E2E_USER_ID): string {
  return `/graph/${graphId}?userId=${encodeURIComponent(userId)}&e2e=1`;
}

export async function createTestGraph(page: Page, testInfo: TestInfo, userId: string = DEFAULT_E2E_USER_ID) {
  const name = `e2e-${toSafeId(testInfo.testId)}`;
  const response = await page.request.post(`/api/graphs?userId=${encodeURIComponent(userId)}`, {
    data: { name },
  });

  if (!response.ok()) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(
      `Failed to create test graph (status=${response.status()}): ${bodyText || response.statusText()}`
    );
  }

  const body = (await response.json()) as { id?: string };
  if (!body.id) {
    throw new Error('Failed to create test graph: response missing id');
  }
  return body.id;
}

export async function gotoTestGraph(page: Page, testInfo: TestInfo, userId: string = DEFAULT_E2E_USER_ID) {
  const graphId = await createTestGraph(page, testInfo, userId);
  await page.goto(makeTestGraphUrl(graphId, userId));
  await page.waitForSelector('#graph-container');
}
