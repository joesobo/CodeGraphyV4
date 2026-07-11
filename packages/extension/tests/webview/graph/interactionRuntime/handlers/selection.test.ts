import { describe, expect, it } from 'vitest';
import {
  collectHighlightedNeighborIds,
  createSelectionHandlers,
  resolveSelectionLinkEndpointId,
} from '../../../../../src/webview/components/graph/interactionRuntime/handlers/selection';
import { createInteractionDependencies } from '../testUtils';
import type { FGLink, FGNode } from '../../../../../src/webview/components/graph/model/build';

describe('graph/selectionHandlers', () => {
  it('resolveSelectionLinkEndpointId returns ids for string and node endpoints', () => {
    expect(resolveSelectionLinkEndpointId('src/app.ts')).toBe('src/app.ts');
    expect(resolveSelectionLinkEndpointId({ id: 'src/utils.ts' } as FGNode)).toBe('src/utils.ts');
  });

  it('resolveSelectionLinkEndpointId returns undefined for missing object endpoints', () => {
    expect(resolveSelectionLinkEndpointId(undefined as never)).toBeUndefined();
    expect(resolveSelectionLinkEndpointId({} as FGNode)).toBeUndefined();
  });

  it('collectHighlightedNeighborIds includes incoming and outgoing neighbors for a node', () => {
    const links = [
      { source: 'src/app.ts', target: 'src/utils.ts' },
      { source: 'src/other.ts', target: 'src/app.ts' },
      { source: 'src/ignored.ts', target: 'src/far.ts' },
    ] as FGLink[];

    expect([...collectHighlightedNeighborIds(links, 'src/app.ts')]).toEqual([
      'src/utils.ts',
      'src/other.ts',
    ]);
  });

  it('collectHighlightedNeighborIds ignores links with missing object endpoints', () => {
    const links = [
      { source: undefined, target: 'src/app.ts' },
      { source: 'src/app.ts', target: undefined },
      { source: { id: 'src/app.ts' }, target: {} },
      { source: {}, target: { id: 'src/app.ts' } },
    ] as FGLink[];

    expect([...collectHighlightedNeighborIds(links, 'src/app.ts')]).toEqual([]);
  });

  it('updates highlight neighbors in 2d mode without bumping highlight version', () => {
    const dependencies = createInteractionDependencies({
      graphDataRef: {
        current: {
          links: [
            { source: { id: 'src/app.ts' }, target: { id: 'src/object.ts' } },
            { source: { id: 'src/incoming.ts' }, target: { id: 'src/app.ts' } },
          ] as FGLink[],
          nodes: [],
        },
      },
    });
    const handlers = createSelectionHandlers(dependencies);

    handlers.setHighlight('src/app.ts');

    expect([...dependencies.highlightedNeighborsRef.current]).toEqual([
      'src/object.ts',
      'src/incoming.ts',
    ]);
  });

  it('clears highlight and selection state', () => {
    const dependencies = createInteractionDependencies();
    dependencies.selectedNodesSetRef.current = new Set(['src/app.ts']);
    const handlers = createSelectionHandlers(dependencies);

    handlers.clearSelection();

    expect(dependencies.highlightedNodeRef.current).toBeNull();
    expect(dependencies.highlightedNeighborsRef.current.size).toBe(0);
    expect(dependencies.selectedNodesSetRef.current.size).toBe(0);
    expect(dependencies.setSelectedNodes).toHaveBeenCalledWith([]);
  });
});
