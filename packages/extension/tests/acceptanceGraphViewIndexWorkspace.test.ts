import { describe, expect, it, vi } from 'vitest';
import type { GraphAcceptanceContext } from './acceptance/graphView/types';
import { indexWorkspace } from './acceptance/graphView/steps';

describe('acceptance graph view indexing step', () => {
  it('does not click the index button when the workspace is already indexed', async () => {
    const indexClick = vi.fn(async () => {
      throw new Error('Index button is absent');
    });
    const frame = createFrame({ indexButtonCount: 0, indexClick });

    await expect(indexWorkspace(createContext(frame))).resolves.toBeUndefined();
    expect(indexClick).not.toHaveBeenCalled();
  });

  it('clicks the index button when the workspace has not been indexed yet', async () => {
    const indexClick = vi.fn(async () => {});
    const frame = createFrame({ indexButtonCount: 1, indexClick });

    await indexWorkspace(createContext(frame));

    expect(indexClick).toHaveBeenCalledOnce();
  });
});

function createContext(frame: unknown): GraphAcceptanceContext {
  return {
    graphFrame: frame,
    nodeProbes: new Map(),
  } as GraphAcceptanceContext;
}

function createFrame(options: { indexButtonCount: number; indexClick: () => Promise<void> }) {
  const closeLocator = createLocator({ count: 0 });
  const indexLocator = createLocator({
    click: options.indexClick,
    count: options.indexButtonCount,
  });
  const stageLocator = createLocator({
    screenshot: async () => Buffer.from('before-index'),
  });

  return {
    getByLabel(label: string) {
      if (label === 'Graph Stage') {
        return stageLocator;
      }

      throw new Error(`Unexpected label: ${label}`);
    },
    getByRole(_role: string, options?: { name?: string }) {
      if (options?.name === 'Close') {
        return closeLocator;
      }
      if (options?.name === 'Index Workspace') {
        return indexLocator;
      }

      throw new Error(`Unexpected role query: ${JSON.stringify(options)}`);
    },
  };
}

function createLocator(options: {
  click?: () => Promise<void>;
  count?: number;
  screenshot?: () => Promise<Buffer>;
} = {}) {
  const locator = {
    click: vi.fn(options.click ?? (async () => {})),
    count: vi.fn(async () => options.count ?? 1),
    first: vi.fn(() => locator),
    screenshot: vi.fn(options.screenshot ?? (async () => Buffer.from('screenshot'))),
  };

  return locator;
}
