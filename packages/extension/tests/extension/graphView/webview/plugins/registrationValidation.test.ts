import { describe, expect, it, vi } from 'vitest';
import {
  createHandlers,
  createState,
} from './registration.fixture';
import {
  registerGraphViewExternalPlugin,
} from '../../../../../src/extension/graphView/webview/plugins/registration/register';

describe('graphView/webview/plugins/registration', () => {
  it('ignores plugin registrations when the plugin value is not an object', () => {
    const state = createState();
    const refreshWebviewResourceRoots = vi.fn();

    registerGraphViewExternalPlugin(
      'plugin.test',
      undefined,
      state,
      createHandlers({ refreshWebviewResourceRoots }),
    );

    expect(state.analyzer?.registry.register).not.toHaveBeenCalled();
    expect(refreshWebviewResourceRoots).not.toHaveBeenCalled();
  });

  it('ignores plugin registrations when the plugin object has no id', () => {
    const state = createState();
    const refreshWebviewResourceRoots = vi.fn();

    registerGraphViewExternalPlugin(
      {
        name: 'Plugin without id',
      },
      undefined,
      state,
      createHandlers({ refreshWebviewResourceRoots }),
    );

    expect(state.analyzer?.registry.register).not.toHaveBeenCalled();
    expect(refreshWebviewResourceRoots).not.toHaveBeenCalled();
  });

  it('ignores invalid plugin registrations when there is no analyzer or plugin id', () => {
    const refreshWebviewResourceRoots = vi.fn();

    registerGraphViewExternalPlugin(
      null,
      undefined,
      createState({ analyzer: undefined }),
      createHandlers({
        getWorkspaceRoot: () => undefined,
        refreshWebviewResourceRoots,
      }),
    );

    expect(refreshWebviewResourceRoots).not.toHaveBeenCalled();
  });
});
