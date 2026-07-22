import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import { expect } from 'vitest';
import type { GraphContextMenuEntry } from '../../../../../src/webview/components/graph/contextMenu/contracts';
import type { GraphContextNodeTarget } from '../../../../../src/webview/components/graph/contextMenu/decision/targets';

export function createContributions(
  contextMenu: ExtensionGraphViewContributionSet['contextMenu'],
): ExtensionGraphViewContributionSet {
  return {
    runtimeNodes: [],
    runtimeEdges: [],
    projections: [],
    forces: [],
    nodeDragEnd: [],
    contextMenu,
    ui: [],
  };
}

export function itemLabels(entries: readonly GraphContextMenuEntry[]): string[] {
  return entries
    .filter((entry): entry is Extract<GraphContextMenuEntry, { kind: 'item' }> => entry.kind === 'item')
    .map(entry => entry.label);
}

export function findItem(
  entries: readonly GraphContextMenuEntry[],
  label: string,
): Extract<GraphContextMenuEntry, { kind: 'item' }> | undefined {
  return entries.find((entry): entry is Extract<GraphContextMenuEntry, { kind: 'item' }> =>
    entry.kind === 'item' && entry.label === label
  );
}

export function item(
  entries: readonly GraphContextMenuEntry[],
  label: string,
): Extract<GraphContextMenuEntry, { kind: 'item' }> {
  const match = entries.find((entry): entry is Extract<GraphContextMenuEntry, { kind: 'item' }> =>
    entry.kind === 'item' && entry.label === label
  );
  expect(match).toBeDefined();
  return match!;
}

export function nodeTarget(overrides: Partial<GraphContextNodeTarget>): GraphContextNodeTarget {
  return {
    id: 'node-1',
    nodeKind: 'file',
    nodeType: 'file',
    ...overrides,
  };
}
