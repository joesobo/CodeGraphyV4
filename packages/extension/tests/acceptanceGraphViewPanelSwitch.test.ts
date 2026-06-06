import { describe, expect, it, vi } from 'vitest';
import type { Frame, Locator } from '@playwright/test';

describe('acceptance graph view panel switches', () => {
  it('does not wait when an optional switch row is absent', async () => {
    const { findPanelSwitchIfPresent } = await import('./acceptance/graphView/steps');
    const missingSwitch = locatorWithCount(0);
    const missingRow = {
      getByRole: vi.fn(() => missingSwitch),
    };
    const frame = {
      locator: vi.fn(() => ({
        filter: vi.fn(() => ({
          first: vi.fn(() => missingRow),
        })),
      })),
      getByRole: vi.fn(() => missingSwitch),
      waitForTimeout: vi.fn(),
    } as unknown as Frame;

    await expect(findPanelSwitchIfPresent(frame, 'Calls')).resolves.toBeUndefined();

    expect(frame.waitForTimeout).not.toHaveBeenCalled();
  });
});

function locatorWithCount(count: number): Locator {
  return {
    count: vi.fn(async () => count),
    first: vi.fn(function first(this: Locator) {
      return this;
    }),
  } as unknown as Locator;
}
