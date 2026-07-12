import { describe, expect, it, vi } from 'vitest';
import { zoomGraphView } from '../../../../../../src/webview/components/graph/interactionRuntime/handlers/view/zoom';
import { createInteractionDependencies } from '../../testUtils';

describe('graph/interactionRuntime/zoom', () => {
  it('scales the current zoom by the requested factor', () => {
    const dependencies = createInteractionDependencies();
    const zoom = vi.mocked(dependencies.fg2dRef.current!.zoom);
    zoom.mockImplementationOnce(() => 1.5);

    zoomGraphView(dependencies, 0.5);

    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenNthCalledWith(1);
    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenNthCalledWith(2, 0.75, 150);
  });

  it('does nothing when the graph ref is missing during zoom', () => {
    const dependencies = createInteractionDependencies({
      fg2dRef: { current: undefined },
    });

    expect(() => zoomGraphView(dependencies, 2)).not.toThrow();
  });
});
