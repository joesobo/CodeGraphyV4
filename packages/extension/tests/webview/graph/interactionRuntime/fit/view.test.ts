import { describe, expect, it } from 'vitest';
import { fitGraphView } from '../../../../../src/webview/components/graph/interactionRuntime/fit/view';
import { createInteractionDependencies } from '../testUtils';

describe('graph/interactionRuntime/fitView', () => {
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

    fitGraphView(dependencies);

    const zoom = dependencies.fg2dRef.current?.zoom;
    expect(zoom).toBeDefined();
    if (!zoom) {
      throw new Error('Expected 2d zoom control to be available');
    }

    expect(dependencies.fg2dRef.current?.centerAt).toHaveBeenCalledWith(50, 50, 300);
    expect(zoom).toHaveBeenNthCalledWith(1, expect.closeTo(0.8461538461538461, 5), 300);
    expect(dependencies.fg2dRef.current?.zoomToFit).not.toHaveBeenCalled();
    expect(dependencies.fg3dRef.current?.zoomToFit).not.toHaveBeenCalled();
  });

  it('falls back to zoom-to-fit when 2d bounds cannot be measured', () => {
    const dependencies = createInteractionDependencies();
    fitGraphView(dependencies);

    expect(dependencies.fg2dRef.current?.zoomToFit).toHaveBeenCalledWith(300, expect.any(Number));
  });

  it('fits the 3d graph view', () => {
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
    });

    fitGraphView(dependencies);

    expect(dependencies.fg3dRef.current?.zoomToFit).toHaveBeenCalledWith(300, 20);
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

    fitGraphView(dependencies);

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

    fitGraphView(dependencies);

    const zoom = dependencies.fg2dRef.current?.zoom;
    expect(zoom).toBeDefined();
    if (!zoom) {
      throw new Error('Expected 2d zoom control to be available');
    }

    expect(dependencies.fg2dRef.current?.centerAt).toHaveBeenCalledWith(50, 103.33333333333334, 300);
    expect(zoom).toHaveBeenNthCalledWith(1, expect.closeTo(0.6, 5), 300);
    expect(dependencies.fg2dRef.current?.zoomToFit).not.toHaveBeenCalled();
  });

  it('tolerates a missing 2d graph ref when fitting the view', () => {
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

    expect(() => fitGraphView(dependencies)).not.toThrow();
  });

  it('tolerates a missing 2d graph ref when falling back to zoom-to-fit', () => {
    const dependencies = createInteractionDependencies({
      fg2dRef: { current: undefined },
    });

    expect(() => fitGraphView(dependencies)).not.toThrow();
  });

  it('tolerates a missing 3d graph ref when fitting the view', () => {
    const dependencies = createInteractionDependencies({
      graphMode: '3d',
      fg3dRef: { current: undefined },
    });

    expect(() => fitGraphView(dependencies)).not.toThrow();
  });
});
