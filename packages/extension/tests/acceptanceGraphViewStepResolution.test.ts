import { describe, expect, it, vi } from 'vitest';
import type { Frame, Locator } from '@playwright/test';
import type { GraphAcceptanceContext } from './acceptance/graphView/types';
import type { AcceptanceRuntimeStep } from './acceptance/graphView/types';

vi.mock('./acceptance/graphView/canvas', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./acceptance/graphView/canvas')>();

  return {
    ...actual,
    clickNode: vi.fn(),
    modifierClickNode: vi.fn(),
    rightClickEdge: vi.fn(),
    rightClickNode: vi.fn(),
  };
});

describe('acceptance graph view step resolution', () => {
  it('routes edge context menu phrases to edge interactions before node interactions', async () => {
    const { graphViewAcceptanceSteps } = await import('./acceptance/graphView/steps');
    const { rightClickEdge, rightClickNode } = await import('./acceptance/graphView/canvas');
    const text = 'I right click the edge going from src/index.ts node to src/types.ts node to open its Graph Context Menu';

    const implementation = graphViewAcceptanceSteps[text];

    await implementation({} as GraphAcceptanceContext, {
      keyword: 'When',
      line: 1,
      sourcePath: 'test.md',
      text,
    } satisfies AcceptanceRuntimeStep);

    expect(rightClickEdge).toHaveBeenCalledWith(expect.anything(), 'src/index.ts', 'src/types.ts');
    expect(rightClickNode).not.toHaveBeenCalled();
  });

  it('uses a modifier click when the acceptance phrase selects multiple nodes', async () => {
    const { graphViewAcceptanceSteps } = await import('./acceptance/graphView/steps');
    const { clickNode, modifierClickNode, rightClickNode } = await import('./acceptance/graphView/canvas');
    const text = 'I click and drag on the background I can select multiple nodes at once';

    const implementation = graphViewAcceptanceSteps[text];

    await implementation({} as GraphAcceptanceContext, {
      keyword: 'When',
      line: 1,
      sourcePath: 'test.md',
      text,
    } satisfies AcceptanceRuntimeStep);

    expect(rightClickNode).not.toHaveBeenCalled();
    expect(clickNode).toHaveBeenCalledWith(expect.anything(), 'src/index.ts');
    expect(modifierClickNode).toHaveBeenCalledWith(expect.anything(), 'src/utils.ts');
  });

  it('enables type imports with the combined Imports acceptance step', async () => {
    const { graphViewAcceptanceSteps } = await import('./acceptance/graphView/steps');
    const frame = graphScopeFrame(['Imports', 'Type imports']);
    const text = 'I toggle the Imports edge on';

    const implementation = graphViewAcceptanceSteps[text];

    await implementation({
      graphFrame: frame,
      vscode: { page: {} },
    } as GraphAcceptanceContext, {
      keyword: 'When',
      line: 1,
      sourcePath: 'test.md',
      text,
    } satisfies AcceptanceRuntimeStep);

    expect(readSwitchClicks(frame)).toEqual({
      Imports: 1,
      'Type imports': 1,
    });
  });
});

function graphScopeFrame(labels: string[]): Frame {
  const switches = new Map(
    labels.map(label => [label, switchLocator(label)]),
  );
  const button = {
    click: vi.fn(async () => undefined),
    count: vi.fn(async () => 1),
    first: vi.fn(function first(this: Locator) {
      return this;
    }),
    isDisabled: vi.fn(async () => false),
    isVisible: vi.fn(async () => true),
  } as unknown as Locator;

  return {
    getByLabel: vi.fn((label: string) => label === 'Graph Stage' ? visibleLocator() : emptyLocator()),
    getByRole: vi.fn((role: string, options?: { name?: string }) => {
      if (role === 'button') {
        return button;
      }

      if (role === 'switch' && typeof options?.name === 'string') {
        const label = options.name.replace(/^Toggle /, '');
        return switches.get(label) ?? emptyLocator();
      }

      return emptyLocator();
    }),
    locator: vi.fn((selector: string) => ({
      filter: vi.fn(({ hasText }: { hasText: RegExp }) => {
        const label = labels.find(candidate => hasText.test(candidate));
        return {
          first: vi.fn(() => ({
            getByRole: vi.fn(() => label ? switches.get(label) : emptyLocator()),
          })),
        };
      }),
      count: vi.fn(async () => selector === '[data-scope-row]' ? labels.length : 0),
    })),
    waitForTimeout: vi.fn(async () => undefined),
  } as unknown as Frame;
}

function readSwitchClicks(frame: Frame): Record<string, number> {
  const switchLocators = (frame as unknown as {
    getByRole: (role: string, options: { name: string }) => Locator;
  });

  return {
    Imports: readLocatorClicks(switchLocators.getByRole('switch', { name: 'Toggle Imports' })),
    'Type imports': readLocatorClicks(switchLocators.getByRole('switch', { name: 'Toggle Type imports' })),
  };
}

function readLocatorClicks(locator: Locator): number {
  return (locator.click as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
}

function emptyLocator(): Locator {
  return {
    count: vi.fn(async () => 0),
    first: vi.fn(function first(this: Locator) {
      return this;
    }),
    getAttribute: vi.fn(async () => null),
    isVisible: vi.fn(async () => false),
  } as unknown as Locator;
}

function visibleLocator(): Locator {
  return {
    count: vi.fn(async () => 1),
    first: vi.fn(function first(this: Locator) {
      return this;
    }),
    isVisible: vi.fn(async () => true),
  } as unknown as Locator;
}

function switchLocator(label: string): Locator {
  let checked = false;

  return {
    click: vi.fn(async () => {
      checked = true;
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
    label,
  } as unknown as Locator;
}
