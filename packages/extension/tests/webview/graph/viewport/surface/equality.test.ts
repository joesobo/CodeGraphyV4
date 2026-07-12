import { describe, expect, it } from 'vitest';
import { areViewportSurfacePropsEqual } from '../../../../../src/webview/components/graph/viewport/surface/equality';
import type { ViewportSurfaceProps } from '../../../../../src/webview/components/graph/viewport/surface/view';

function viewportProps(): ViewportSurfaceProps {
  return {
    canvasBackgroundColor: '#fff',
    directionMode: 'arrows',
    surface2dProps: {
      physicsPaused: false,
      physicsSettings: {
        centerForce: 0.1,
        damping: 0.7,
        linkDistance: 80,
        linkForce: 0.15,
        repelForce: -250,
      },
    },
  } as ViewportSurfaceProps;
}

describe('viewport surface equality', () => {
  it('rerenders when owned physics settings or pause state change', () => {
    const previous = viewportProps();
    const changedSettings = viewportProps();
    changedSettings.surface2dProps.physicsSettings = {
      ...changedSettings.surface2dProps.physicsSettings!,
      centerForce: 0.25,
    };
    const paused = viewportProps();
    paused.surface2dProps.physicsPaused = true;

    expect(areViewportSurfacePropsEqual(previous, changedSettings)).toBe(false);
    expect(areViewportSurfacePropsEqual(previous, paused)).toBe(false);
  });

  it('rerenders when owned renderer callbacks or plugin contributions change', () => {
    const previous = viewportProps();
    const changedStyle = viewportProps();
    changedStyle.surface2dProps.getNodeStyle = () => ({}) as never;
    const changedLabels = viewportProps();
    changedLabels.surface2dProps.nodeLabelCanvasObject = () => {};
    const changedContributions = viewportProps();
    changedContributions.surface2dProps.graphViewContributions = {} as never;

    expect(areViewportSurfacePropsEqual(previous, changedStyle)).toBe(false);
    expect(areViewportSurfacePropsEqual(previous, changedLabels)).toBe(false);
    expect(areViewportSurfacePropsEqual(previous, changedContributions)).toBe(false);
  });
});
