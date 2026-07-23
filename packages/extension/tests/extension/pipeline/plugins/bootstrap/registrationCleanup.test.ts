import { describe, expect, it, vi } from 'vitest';
import { disposeRejectedPluginRuntime } from '../../../../../src/extension/pipeline/plugins/bootstrap/registrationCleanup';

describe('disposeRejectedPluginRuntime', () => {
  it('reports cleanup failure without throwing', () => {
    const warn = vi.fn();

    expect(() => disposeRejectedPluginRuntime({
      id: 'acme.broken',
      onUnload: () => {
        throw new Error('cleanup failed');
      },
    }, warn)).not.toThrow();

    expect(warn).toHaveBeenCalledWith(
      "CodeGraphy plugin 'acme.broken' could not be unloaded after registration failed: cleanup failed",
    );
  });
});
