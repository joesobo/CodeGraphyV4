import { describe, expect, it } from 'vitest';
import type { Frame } from '@playwright/test';
import {
  clickToolbarButton,
  clickFitToScreenIfAvailable,
  getGraphCounts,
  graphEdge,
  graphNodeProbeRadius,
  graphNodeByExactPathOrBasename,
} from './acceptance/graphView/canvas';

function frameWithBodyText(text: string): Frame {
  return {
    locator: () => ({
      innerText: async () => text,
    }),
  } as unknown as Frame;
}

describe('acceptance graph canvas helpers', () => {
  it('matches the renderer square-root zoom compensation when probing node pixels', () => {
    expect(graphNodeProbeRadius(20, 0.25)).toBe(10);
  });

  it('reads graph counts with a singular connection label', async () => {
    await expect(getGraphCounts(frameWithBodyText('5 nodes • 1 connection'))).resolves.toEqual({
      nodes: 5,
      edges: 1,
    });
  });

  it('reads graph counts with a plural connection label', async () => {
    await expect(getGraphCounts(frameWithBodyText('5 nodes • 2 connections'))).resolves.toEqual({
      nodes: 5,
      edges: 2,
    });
  });

  it('uses the first matching edge marker when multiple relations share endpoints', () => {
    const firstEdge = { id: 'first-edge' };
    const edgeLocator = {
      first: () => firstEdge,
    };
    const frame = {
      getByLabel: (label: string, options: { exact: boolean }) => {
        expect(label).toBe('Graph edge src/a.ts to src/b.ts');
        expect(options).toEqual({ exact: true });
        return edgeLocator;
      },
    } as unknown as Frame;

    expect(graphEdge(frame, 'src/a.ts', 'src/b.ts')).toBe(firstEdge);
  });

  it('force-clicks toolbar buttons that may be partially covered by open panels', async () => {
    const clicks: unknown[] = [];
    const frame = {
      getByTitle: (title: string) => {
        expect(title).toBe('Graph Scope');
        return {
          click: async (options: unknown) => {
            clicks.push(options);
          },
        };
      },
    } as unknown as Frame;

    await clickToolbarButton(frame, 'Graph Scope');

    expect(clicks).toEqual([{ force: true }]);
  });

  it('clicks Fit to Screen through the DOM when probing graph nodes', async () => {
    const clicks: string[] = [];
    const frame = {
      getByRole: (role: string, options: { name: string }) => {
        expect(role).toBe('button');
        expect(options).toEqual({ name: 'Fit to Screen' });
        return {
          count: async () => 1,
          evaluate: async (callback: (element: HTMLElement) => void) => {
            callback({
              click: () => {
                clicks.push('clicked');
              },
            } as HTMLElement);
          },
        };
      },
    } as unknown as Frame;

    await clickFitToScreenIfAvailable(frame);

    expect(clicks).toEqual(['clicked']);
  });

  it('resolves graph nodes by basename when folder scenario text uses the visible label', async () => {
    const exactAliasLocator = { count: async () => 0 };
    const nestedAliasLocator = { id: 'src/alias' };
    const frame = {
      getByLabel: (label: string, options: { exact: boolean }) => {
        expect(options).toEqual({ exact: true });
        if (label === 'Graph node alias') {
          return exactAliasLocator;
        }
        if (label === 'Graph node src/alias') {
          return nestedAliasLocator;
        }
        throw new Error(`Unexpected label ${label}`);
      },
      locator: (selector: string) => {
        expect(selector).toBe('[aria-label^="Graph node "]');
        return {
          evaluateAll: async (
            callback: (items: Array<{ getAttribute: (name: string) => string | null }>, requestedPath: string) => string | undefined,
            requestedPath: string,
          ) => callback([
            { getAttribute: () => 'Graph node src' },
            { getAttribute: () => 'Graph node src/alias' },
          ], requestedPath),
        };
      },
    } as unknown as Frame;

    await expect(graphNodeByExactPathOrBasename(frame, 'alias')).resolves.toBe(nestedAliasLocator);
  });
});
