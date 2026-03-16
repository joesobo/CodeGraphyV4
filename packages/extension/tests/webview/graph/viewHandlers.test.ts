import { describe, expect, it } from 'vitest';
import { createViewHandlers } from '../../../src/webview/components/graph/interactionHandlers/viewHandlers';
import { createInteractionDependencies } from './interactionHandlers.testUtils';

describe('graph/viewHandlers', () => {
  it('focuses nodes in 2d and 3d graph modes', () => {
    const twoDimensional = createInteractionDependencies({
      graphMode: '2d',
    });
    const twoDimensionalHandlers = createViewHandlers(twoDimensional);

    twoDimensionalHandlers.focusNodeById('src/app.ts');

    expect(twoDimensional.fg2dRef.current?.centerAt).toHaveBeenCalledWith(0, 0, 300);
    expect(twoDimensional.fg2dRef.current?.zoom).toHaveBeenCalledWith(1.5, 300);

    const threeDimensional = createInteractionDependencies({
      graphMode: '3d',
    });
    const threeDimensionalHandlers = createViewHandlers(threeDimensional);

    threeDimensionalHandlers.focusNodeById('src/app.ts');

    expect(threeDimensional.fg3dRef.current?.zoomToFit).toHaveBeenCalledWith(
      300,
      20,
      expect.any(Function),
    );
  });

  it('fits, zooms, and updates access counts', () => {
    const dependencies = createInteractionDependencies();
    const handlers = createViewHandlers(dependencies);

    handlers.fitView();
    handlers.zoom2d(2);
    handlers.updateAccessCount('src/app.ts', 7);

    expect(dependencies.fg2dRef.current?.zoomToFit).toHaveBeenCalledWith(300, 20);
    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenCalledWith(2, 150);
    expect(dependencies.dataRef.current.nodes[0]?.accessCount).toBe(7);
  });
});
