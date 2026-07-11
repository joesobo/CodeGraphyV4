import { describe, expect, it, vi } from 'vitest';
import { createPluginRuntimeFailureReporter } from '../../../src/webview/pluginHost/failure';

describe('plugin runtime failure reporter', () => {
  it('removes and disables a throwing webview plugin once', () => {
    const removePlugin = vi.fn();
    const postHostMessage = vi.fn();
    const report = createPluginRuntimeFailureReporter(
      'fixture.throwing-renderer',
      removePlugin,
      postHostMessage,
    );

    report('node renderer', new Error('deliberate render failure'));
    report('overlay renderer', new Error('second failure'));

    expect(removePlugin).toHaveBeenCalledOnce();
    expect(postHostMessage).toHaveBeenCalledTimes(2);
    expect(postHostMessage).toHaveBeenNthCalledWith(1, {
      type: 'PLUGIN_RUNTIME_FAILED',
      payload: {
        pluginId: 'fixture.throwing-renderer',
        hook: 'node renderer',
        message: 'deliberate render failure',
      },
    });
    expect(postHostMessage).toHaveBeenNthCalledWith(2, {
      type: 'TOGGLE_PLUGIN',
      payload: {
        pluginId: 'fixture.throwing-renderer',
        enabled: false,
      },
    });
  });
});
