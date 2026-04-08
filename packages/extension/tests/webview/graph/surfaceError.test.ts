import { describe, expect, it, vi } from 'vitest';
import { handleGraphSurface3dError } from '../../../src/webview/components/graph/surfaceError';

describe('graph/surfaceError', () => {
  it('posts the 3d unavailable message and falls back to 2d', () => {
    const postGraphMessage = vi.fn();
    const setGraphMode = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const error = new Error('Error creating WebGL context.');

    handleGraphSurface3dError({ error, postGraphMessage, setGraphMode });

    expect(consoleError).toHaveBeenCalledWith(
      '[CodeGraphy] 3D graph unavailable, falling back to 2D.',
      error,
    );
    expect(postGraphMessage).toHaveBeenCalledWith({
      type: 'GRAPH_3D_UNAVAILABLE',
      payload: { message: 'Error creating WebGL context.' },
    });
    expect(setGraphMode).toHaveBeenCalledWith('2d');
  });
});
