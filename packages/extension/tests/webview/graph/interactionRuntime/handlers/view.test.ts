import { describe, expect, it } from 'vitest';
import { createViewHandlers } from '../../../../../src/webview/components/graph/interactionRuntime/handlers/view';
import { createInteractionDependencies } from '../testUtils';

describe('graph/viewHandlers', () => {
  it('focuses a 2d node at the origin when coordinates are missing', () => {
    const dependencies = createInteractionDependencies({
    });
    dependencies.graphDataRef.current.nodes[0] = {
      ...dependencies.graphDataRef.current.nodes[0],
      x: undefined,
      y: undefined,
    };

    createViewHandlers(dependencies).focusNodeById('src/app.ts');

    expect(dependencies.fg2dRef.current?.centerAt).toHaveBeenCalledWith(0, 0, 300);
    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenCalledWith(1.5, 300);
  });

  it('does nothing when focusing a node that is not in the graph', () => {
    const dependencies = createInteractionDependencies();

    createViewHandlers(dependencies).focusNodeById('src/missing.ts');

    expect(dependencies.fg2dRef.current?.centerAt).not.toHaveBeenCalled();
    expect(dependencies.fg2dRef.current?.zoom).not.toHaveBeenCalled();
  });

  it('tolerates a missing 2d graph ref when focusing a node', () => {
    const dependencies = createInteractionDependencies({
      fg2dRef: { current: undefined },
    });

    expect(() => createViewHandlers(dependencies).focusNodeById('src/app.ts')).not.toThrow();
  });

  it('fits the 2d graph view', () => {
    const dependencies = createInteractionDependencies();
    Object.defineProperty(dependencies.containerRef.current, 'clientWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(dependencies.containerRef.current, 'clientHeight', {
      configurable: true,
      value: 300,
    });
    dependencies.graphDataRef.current.nodes = dependencies.graphDataRef.current.nodes.map((node, index) => ({
      ...node,
      size: [80, 80, 80][index],
    }));

    createViewHandlers(dependencies).fitView();

    const zoom = dependencies.fg2dRef.current?.zoom;
    expect(zoom).toBeDefined();
    if (!zoom) {
      throw new Error('Expected 2d zoom control to be available');
    }

    expect(dependencies.fg2dRef.current?.centerAt).toHaveBeenCalledWith(50, 50, 300);
    expect(zoom).toHaveBeenNthCalledWith(1, expect.closeTo(0.8461538461538461, 5), 300);
    expect(dependencies.fg2dRef.current?.zoomToFit).not.toHaveBeenCalled();
  });

  it('tolerates a missing 2d graph ref when fitting the view with measurable bounds', () => {
    const dependencies = createInteractionDependencies({
      fg2dRef: { current: undefined },
    });
    Object.defineProperty(dependencies.containerRef.current, 'clientWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(dependencies.containerRef.current, 'clientHeight', {
      configurable: true,
      value: 300,
    });

    expect(() => createViewHandlers(dependencies).fitView()).not.toThrow();
  });

  it('tolerates a missing 2d graph ref when falling back to zoom-to-fit', () => {
    const dependencies = createInteractionDependencies({
      fg2dRef: { current: undefined },
    });

    expect(() => createViewHandlers(dependencies).fitView()).not.toThrow();
  });

  it('pads 2d fit view by the largest rendered node size when available', () => {
    const dependencies = createInteractionDependencies();
    Object.defineProperty(dependencies.containerRef.current, 'clientWidth', {
      configurable: true,
      value: 0,
    });
    Object.defineProperty(dependencies.containerRef.current, 'clientHeight', {
      configurable: true,
      value: 0,
    });
    dependencies.graphDataRef.current.nodes = dependencies.graphDataRef.current.nodes.map((node, index) => ({
      ...node,
      size: [24, 36, 52][index],
    }));

    createViewHandlers(dependencies).fitView();

    expect(dependencies.fg2dRef.current?.zoomToFit).toHaveBeenCalledWith(300, 176);
  });

  it('adds extra bottom clearance when fitting the depth view in 2d', () => {
    const dependencies = createInteractionDependencies({
      depthMode: true,
    });
    Object.defineProperty(dependencies.containerRef.current, 'clientWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(dependencies.containerRef.current, 'clientHeight', {
      configurable: true,
      value: 300,
    });
    dependencies.graphDataRef.current.nodes = dependencies.graphDataRef.current.nodes.map((node, index) => ({
      ...node,
      size: [80, 80, 80][index],
    }));

    createViewHandlers(dependencies).fitView();

    const zoom = dependencies.fg2dRef.current?.zoom;
    expect(zoom).toBeDefined();
    if (!zoom) {
      throw new Error('Expected 2d zoom control to be available');
    }

    expect(dependencies.fg2dRef.current?.centerAt).toHaveBeenCalledWith(50, 103.33333333333334, 300);
    expect(zoom).toHaveBeenNthCalledWith(1, expect.closeTo(0.6, 5), 300);
    expect(dependencies.fg2dRef.current?.zoomToFit).not.toHaveBeenCalled();
  });

  it('scales the pending 2d zoom destination by the requested factor', () => {
    const dependencies = createInteractionDependencies();

    createViewHandlers(dependencies).zoomGraphView(0.5);

    expect(dependencies.fg2dRef.current?.zoom).not.toHaveBeenCalled();
    expect(dependencies.fg2dRef.current?.zoomBy).toHaveBeenCalledWith(0.5, 150);
  });

  it('does nothing when the 2d graph ref is missing during zoom', () => {
    const dependencies = createInteractionDependencies({
      fg2dRef: { current: undefined },
    });

    expect(() => createViewHandlers(dependencies).zoomGraphView(2)).not.toThrow();
  });
});
