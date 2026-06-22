import { describe, expect, it, vi } from 'vitest';
import type { Frame, Locator } from '@playwright/test';

vi.mock('@playwright/test', () => {
  const expectLocator = vi.fn((locator: Locator) => ({
    async toBeHidden(): Promise<void> {
      const visible = await locator.isVisible?.();
      if (visible) {
        throw new Error('Expected locator to be hidden');
      }
    },
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

  it('does not require plugin switches to remain visible after toggling', async () => {
    const { setPluginSwitch } = await import('./acceptance/graphView/steps');
    const pluginSwitch = switchLocator({ checked: false, visible: true });
    const frame = panelFrameForSwitch(pluginSwitch);

    await setPluginSwitch({ graphFrame: frame } as never, 'TypeScript/JavaScript', true);

    expect(pluginSwitch.click).toHaveBeenCalledOnce();
  });

  it('can force an already-enabled plugin switch through an off-on transition', async () => {
    const { setPluginSwitch } = await import('./acceptance/graphView/steps');
    const pluginSwitch = togglingSwitchLocator({ initiallyChecked: true });
    const frame = panelFrameForSwitch(pluginSwitch);

    await setPluginSwitch({ graphFrame: frame } as never, 'Unity', true, {
      forceTransition: true,
    });

    expect(pluginSwitch.click).toHaveBeenCalledTimes(2);
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
});

function locatorWithCount(count: number): Locator {
  return {
    count: vi.fn(async () => count),
    first: vi.fn(function first(this: Locator) {
      return this;
    }),
  } as unknown as Locator;
}

function settlingSwitchLocator({ checkedAfterClicks }: { checkedAfterClicks: number }): Locator {
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
    isVisible: vi.fn(async () => true),
  } as unknown as Locator;
}

function togglingSwitchLocator({ initiallyChecked }: { initiallyChecked: boolean }): Locator {
  let checked = initiallyChecked;

  return {
    click: vi.fn(async () => {
      checked = !checked;
    }),
    count: vi.fn(async () => 1),
    first: vi.fn(function first(this: Locator) {
      return this;
    }),
    getAttribute: vi.fn(async (name: string) => {
      if (name !== 'aria-checked') {
        return null;
      }

      return String(checked);
    }),
    isVisible: vi.fn(async () => true),
  } as unknown as Locator;
}

function switchLocator({
  checked,
  visible,
}: {
  checked: boolean;
  visible: boolean;
}): Locator {
  return {
    click: vi.fn(),
    count: vi.fn(async () => 1),
    first: vi.fn(function first(this: Locator) {
      return this;
    }),
    getAttribute: vi.fn(async (name: string) => {
      if (name !== 'aria-checked') {
        return null;
      }

      return String(checked);
    }),
    isVisible: vi.fn(async () => visible),
  } as unknown as Locator;
}

function panelFrameForSwitch(switchInRow: Locator): Frame {
  const row = {
    getByRole: vi.fn(() => switchInRow),
  };

  return {
    locator: vi.fn(() => ({
      filter: vi.fn(() => ({
        first: vi.fn(() => row),
      })),
    })),
    getByRole: vi.fn((_role: string, options?: { name?: string }) =>
      options?.name === 'Indexing progress' ? hiddenLocator() : locatorWithCount(0)
    ),
    waitForTimeout: vi.fn(),
  } as unknown as Frame;
}

function hiddenLocator(): Locator {
  return {
    count: vi.fn(async () => 0),
    first: vi.fn(function first(this: Locator) {
      return this;
    }),
    isVisible: vi.fn(async () => false),
  } as unknown as Locator;
}
