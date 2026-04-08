import { describe, expect, it } from 'vitest';
import { zoom2d } from '../../../../src/webview/components/graph/interactionRuntime/zoom';
import { createInteractionDependencies } from './testUtils';

describe('graph/interactionRuntime/zoom', () => {
  it('scales the current 2d zoom by the requested factor', () => {
    const dependencies = createInteractionDependencies();
    const zoom = dependencies.fg2dRef.current!.zoom!;
    zoom.mockImplementationOnce?.(() => 1.5);

    zoom2d(dependencies, 0.5);

    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenNthCalledWith(1);
    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenNthCalledWith(2, 0.75, 150);
  });

  it('does nothing when the 2d graph ref is missing during zoom', () => {
    const dependencies = createInteractionDependencies({
      fg2dRef: { current: undefined },
    });

    expect(() => zoom2d(dependencies, 2)).not.toThrow();
  });
});
