import { describe, expect, it } from 'vitest';
import { createSelectionHandlers } from '../../../src/webview/components/graph/interactionHandlers/selectionHandlers';
import { createInteractionDependencies } from './interactionHandlers.testUtils';

describe('graph/selectionHandlers', () => {
  it('tracks highlighted neighbors and bumps 3d highlight state', () => {
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
    });
    const handlers = createSelectionHandlers(dependencies);

    handlers.setHighlight('src/app.ts');

    expect(dependencies.highlightedNodeRef.current).toBe('src/app.ts');
    expect([...dependencies.highlightedNeighborsRef.current]).toEqual([
      'src/utils.ts',
      'src/other.ts',
    ]);
    expect(dependencies.setHighlightVersion).toHaveBeenCalledWith(expect.any(Function));
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
