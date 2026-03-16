import { describe, expect, it } from 'vitest';
import { createViewHandlers } from '../../../src/webview/components/graph/interactions/view';
import { createInteractionDependencies } from './interactions/testUtils';

describe('graph/viewHandlers', () => {
  it('focuses a 2d node at the origin when coordinates are missing', () => {
    const dependencies = createInteractionDependencies({
      graphMode: '2d',
    });
    dependencies.graphDataRef.current.nodes[0] = {
      ...dependencies.graphDataRef.current.nodes[0],
      x: undefined,
      y: undefined,
    };

    createViewHandlers(dependencies).focusNodeById('src/app.ts');

    expect(dependencies.fg2dRef.current?.centerAt).toHaveBeenCalledWith(0, 0, 300);
    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenCalledWith(1.5, 300);
    expect(dependencies.fg3dRef.current?.zoomToFit).not.toHaveBeenCalled();
  });

  it('focuses a 3d node by filtering zoom-to-fit candidates by id', () => {
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
    });

    createViewHandlers(dependencies).focusNodeById('src/app.ts');

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

    createViewHandlers(dependencies).focusNodeById('src/missing.ts');

    expect(dependencies.fg2dRef.current?.centerAt).not.toHaveBeenCalled();
    expect(dependencies.fg2dRef.current?.zoom).not.toHaveBeenCalled();
    expect(dependencies.fg3dRef.current?.zoomToFit).not.toHaveBeenCalled();
  });

  it('tolerates a missing 2d graph ref when focusing a node', () => {
    const dependencies = createInteractionDependencies({
      graphMode: '2d',
      fg2dRef: { current: undefined },
    });

    expect(() => createViewHandlers(dependencies).focusNodeById('src/app.ts')).not.toThrow();
  });

  it('fits the 2d graph view', () => {
    const dependencies = createInteractionDependencies();

    createViewHandlers(dependencies).fitView();

    expect(dependencies.fg2dRef.current?.zoomToFit).toHaveBeenCalledWith(300, 20);
    expect(dependencies.fg3dRef.current?.zoomToFit).not.toHaveBeenCalled();
  });

  it('fits the 3d graph view', () => {
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
    });

    createViewHandlers(dependencies).fitView();

    expect(dependencies.fg3dRef.current?.zoomToFit).toHaveBeenCalledWith(300, 20);
  });

  it('tolerates a missing 3d graph ref when fitting the view', () => {
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
      fg3dRef: { current: undefined },
    });

    expect(() => createViewHandlers(dependencies).fitView()).not.toThrow();
  });

  it('scales the current 2d zoom by the requested factor', () => {
    const dependencies = createInteractionDependencies();
    dependencies.fg2dRef.current?.zoom.mockImplementationOnce(() => 1.5);

    createViewHandlers(dependencies).zoom2d(0.5);

    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenNthCalledWith(1);
    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenNthCalledWith(2, 0.75, 150);
  });

  it('does nothing when the 2d graph ref is missing during zoom', () => {
    const dependencies = createInteractionDependencies({
      fg2dRef: { current: undefined },
    });

    expect(() => createViewHandlers(dependencies).zoom2d(2)).not.toThrow();
  });

  it('updates the access count for the matching node only', () => {
    const dependencies = createInteractionDependencies();

    createViewHandlers(dependencies).updateAccessCount('src/app.ts', 7);

    expect(dependencies.dataRef.current.nodes[0]?.accessCount).toBe(7);
    expect(dependencies.dataRef.current.nodes[1]?.accessCount).toBeUndefined();
  });

  it('does nothing when updating the access count for a missing node', () => {
    const dependencies = createInteractionDependencies();
    const originalNodes = dependencies.dataRef.current.nodes.map((node) => ({ ...node }));

    createViewHandlers(dependencies).updateAccessCount('src/missing.ts', 7);

    expect(dependencies.dataRef.current.nodes).toEqual(originalNodes);
  });
});
