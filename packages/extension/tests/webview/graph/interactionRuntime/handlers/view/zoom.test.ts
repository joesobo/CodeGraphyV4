import { describe, expect, it } from 'vitest';
import { zoomGraphView } from '../../../../../../src/webview/components/graph/interactionRuntime/handlers/view/zoom';
import { createInteractionDependencies } from '../../testUtils';

describe('graph/interactionRuntime/zoom', () => {
  it('scales the camera destination without changing zoom getter semantics', () => {
    const dependencies = createInteractionDependencies();

    zoomGraphView(dependencies, 0.5);

    expect(dependencies.fg2dRef.current?.zoom).not.toHaveBeenCalled();
    expect(dependencies.fg2dRef.current?.zoomBy).toHaveBeenCalledWith(0.5, 150);
  });

  it('does nothing when the graph ref is missing during zoom', () => {
    const dependencies = createInteractionDependencies({
      fg2dRef: { current: undefined },
    });

    expect(() => zoomGraphView(dependencies, 2)).not.toThrow();
  });
});
