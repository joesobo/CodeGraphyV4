import { describe, expect, it } from 'vitest';
import { focusNodeById } from '../../../../../../src/webview/components/graph/interactionRuntime/handlers/view/focus';
import { createInteractionDependencies } from '../../testUtils';

describe('graph/interactionRuntime/focus', () => {
  it('focuses a 2d node at the origin when coordinates are missing', () => {
    const dependencies = createInteractionDependencies({
      graphMode: '2d',
    });
    dependencies.graphDataRef.current.nodes[0] = {
      ...dependencies.graphDataRef.current.nodes[0],
      x: undefined,
      y: undefined,
    };

    focusNodeById(dependencies, 'src/app.ts');

    expect(dependencies.fg2dRef.current?.centerAt).toHaveBeenCalledWith(0, 0, 300);
    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenCalledWith(1.5, 300);
    expect(dependencies.fg3dRef.current?.zoomToFit).not.toHaveBeenCalled();
  });

  it('focuses a 3d node by filtering zoom-to-fit candidates by id', () => {
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
    });

    focusNodeById(dependencies, 'src/app.ts');

    const predicate = dependencies.fg3dRef.current?.zoomToFit.mock.calls[0]?.[2] as
      | ((candidate: { id: string }) => boolean)
      | undefined;

    expect(dependencies.fg3dRef.current?.zoomToFit).toHaveBeenCalledWith(
      300,
      20,
      expect.any(Function),
    );
    expect(predicate?.({ id: 'src/app.ts' })).toBe(true);
    expect(predicate?.({ id: 'src/utils.ts' })).toBe(false);
    expect(dependencies.fg2dRef.current?.centerAt).not.toHaveBeenCalled();
  });

  it('does nothing when focusing a node that is not in the graph', () => {
    const dependencies = createInteractionDependencies();

    focusNodeById(dependencies, 'src/missing.ts');

    expect(dependencies.fg2dRef.current?.centerAt).not.toHaveBeenCalled();
    expect(dependencies.fg2dRef.current?.zoom).not.toHaveBeenCalled();
    expect(dependencies.fg3dRef.current?.zoomToFit).not.toHaveBeenCalled();
  });

  it('tolerates a missing 2d graph ref when focusing a node', () => {
    const dependencies = createInteractionDependencies({
      graphMode: '2d',
      fg2dRef: { current: undefined },
    });

    expect(() => focusNodeById(dependencies, 'src/app.ts')).not.toThrow();
  });
});
