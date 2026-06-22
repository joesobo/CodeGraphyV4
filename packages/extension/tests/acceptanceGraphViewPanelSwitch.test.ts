import { describe, expect, it, vi } from 'vitest';
import type { Frame, Locator } from '@playwright/test';

vi.mock('@playwright/test', () => {
  const expectLocator = vi.fn((locator: Locator) => ({
    async toHaveAttribute(name: string, expected: string): Promise<void> {
      const actual = await locator.getAttribute(name);
      if (actual !== expected) {
        throw new Error(`Expected ${name} to be ${expected}, got ${actual}`);
      }
    },
  }));

  return {
    expect: Object.assign(expectLocator, {
      poll(callback: () => Promise<string>) {
        return {
          async toBe(expected: string): Promise<void> {
            for (let attempt = 0; attempt < 5; attempt += 1) {
              if (await callback() === expected) {
                return;
              }
            }
            throw new Error(`Expected poll to resolve to ${expected}`);
          },
        };
      },
    }),
  };
});

describe('acceptance graph view panel switches', () => {
  it('requires only structural node type switches during pre-index example setup', async () => {
    const { requiresCoreNodeTypeSwitch } = await import('./acceptance/graphView/steps');

    expect(requiresCoreNodeTypeSwitch('File')).toBe(true);
    expect(requiresCoreNodeTypeSwitch('Folder')).toBe(true);
    expect(requiresCoreNodeTypeSwitch('Package')).toBe(true);

    expect(requiresCoreNodeTypeSwitch('Class')).toBe(false);
    expect(requiresCoreNodeTypeSwitch('Interface')).toBe(false);
    expect(requiresCoreNodeTypeSwitch('Type')).toBe(false);
    expect(requiresCoreNodeTypeSwitch('Godot class_name')).toBe(false);
  });

  it('does not wait when an optional switch row is absent', async () => {
    const { findPanelSwitchIfPresent } = await import('./acceptance/graphView/steps');
    const missingSwitch = locatorWithCount(0);
    const missingRow = {
      first: vi.fn(function first(this: unknown) {
        return this;
      }),
      getByRole: vi.fn(() => missingSwitch),
    };
    const frame = {
      locator: vi.fn((selector: string) => (
        isSwitchSelector(selector) ? missingSwitch : missingRow
      )),
      getByRole: vi.fn(() => missingSwitch),
      waitForTimeout: vi.fn(),
    } as unknown as Frame;

    await expect(findPanelSwitchIfPresent(frame, 'Calls')).resolves.toBeUndefined();

    expect(frame.waitForTimeout).not.toHaveBeenCalled();
  });

  it('finds visible switch rows by their exact data scope label', async () => {
    const { findPanelSwitchIfPresent } = await import('./acceptance/graphView/steps');
    const variableSwitch = locatorWithCount(1);
    const missingSwitch = locatorWithCount(0);
    const variableRow = panelRowForSwitch(variableSwitch);
    const missingRow = panelRowForSwitch(missingSwitch);
    const frame = {
      locator: vi.fn((selector: string) => (
        isSwitchSelector(selector)
          ? (selector.startsWith('[data-scope-row="Variable"]') ? variableSwitch : missingSwitch)
          : (selector === '[data-scope-row="Variable"]' ? variableRow : missingRow)
      )),
      getByRole: vi.fn(() => missingSwitch),
      waitForTimeout: vi.fn(),
    } as unknown as Frame;

    await expect(findPanelSwitchIfPresent(frame, 'Variable')).resolves.toBe(variableSwitch);

    expect(frame.locator).toHaveBeenCalledWith('[data-scope-row="Variable"]');
  });

  it('treats lost Playwright execution contexts as frame detachments', async () => {
    const { isFrameDetachedError } = await import('./acceptance/graphView/steps');

    expect(isFrameDetachedError(new Error('Frame was detached'))).toBe(true);
    expect(isFrameDetachedError(new Error('Protocol error (DOM.scrollIntoViewIfNeeded): Cannot find context with specified id'))).toBe(true);
    expect(isFrameDetachedError(new Error('ordinary assertion failure'))).toBe(false);
  });

  it('treats same-kind variable children as optional when selecting a parent row', async () => {
    const { collectScopeLabelSelection } = await import('./acceptance/graphView/steps');

    const selection = collectScopeLabelSelection(['Variable']);

    expect([...selection.required]).toEqual(['Variable', 'Symbol']);
    expect(selection.optional.has('Plain Variable')).toBe(true);
    expect(selection.optional.has('Exported Property')).toBe(true);
    expect(selection.required.has('Plain Variable')).toBe(false);
    expect(selection.required.has('Exported Property')).toBe(false);
  });

  it('retries enabling a present switch until the checked state settles', async () => {
    const { setPanelSwitch } = await import('./acceptance/graphView/steps');
    const switchInRow = settlingSwitchLocator({ checkedAfterClicks: 2 });
    const frame = panelFrameForSwitch(switchInRow);

    await setPanelSwitch({ graphFrame: frame } as never, 'Typedef', true);

    expect(switchInRow.click).toHaveBeenCalledTimes(2);
  });

  it('retries enabling an optional present switch until the checked state settles', async () => {
    const { setPanelSwitchIfPresent } = await import('./acceptance/graphView/steps');
    const switchInRow = settlingSwitchLocator({ checkedAfterClicks: 2 });
    const frame = panelFrameForSwitch(switchInRow);

    await setPanelSwitchIfPresent({ graphFrame: frame } as never, 'Type imports', true);

    expect(switchInRow.click).toHaveBeenCalledTimes(2);
  });

  it('reads the final checked state from a present switch even during transient visibility misses', async () => {
    const { setPanelSwitch } = await import('./acceptance/graphView/steps');
    const switchInRow = settlingSwitchLocator({ checkedAfterClicks: 0, visible: false });
    const frame = panelFrameForSwitch(switchInRow);

    await setPanelSwitch({ graphFrame: frame } as never, 'Variable', true);

    expect(switchInRow.click).not.toHaveBeenCalled();
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

function settlingSwitchLocator({
  checkedAfterClicks,
  visible = true,
}: {
  checkedAfterClicks: number;
  visible?: boolean;
}): Locator {
  let clicks = 0;

  return {
    click: vi.fn(async () => {
      clicks += 1;
    }),
    count: vi.fn(async () => 1),
    first: vi.fn(function first(this: Locator) {
      return this;
    }),
    getAttribute: vi.fn(async (name: string) => {
      if (name !== 'aria-checked') {
        return null;
      }

      return String(clicks >= checkedAfterClicks);
    }),
    isVisible: vi.fn(async () => visible),
  } as unknown as Locator;
}

function panelFrameForSwitch(switchInRow: Locator): Frame {
  const row = panelRowForSwitch(switchInRow);

  return {
    locator: vi.fn((selector: string) => (
      isSwitchSelector(selector) ? switchInRow : row
    )),
    getByRole: vi.fn(() => locatorWithCount(0)),
    waitForTimeout: vi.fn(),
  } as unknown as Frame;
}

function panelRowForSwitch(switchInRow: Locator) {
  const row = {
    first: vi.fn(() => row),
    getByRole: vi.fn(() => switchInRow),
  };

  return row;
}

function isSwitchSelector(selector: string): boolean {
  return selector.includes('[role="switch"]')
    || selector.includes(' button')
    || selector.startsWith('[aria-label=');
}
