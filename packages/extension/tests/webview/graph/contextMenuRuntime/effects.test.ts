import { describe, expect, it, vi } from 'vitest';
import type { GraphContextMenuRuntimeDependencies } from '../../../../src/webview/components/graph/contextMenuRuntime/controller';
import { createContextMenuEffectRuntime } from '../../../../src/webview/components/graph/contextMenuRuntime/effects';

function createDependencies(
  overrides: Partial<GraphContextMenuRuntimeDependencies> = {},
): Pick<
  GraphContextMenuRuntimeDependencies,
  'clearCachedFile' | 'fitView' | 'focusNode' | 'postMessage'
> {
  return {
    clearCachedFile: vi.fn(),
    fitView: vi.fn(),
    focusNode: vi.fn(),
    postMessage: vi.fn(),
    ...overrides,
  };
}

describe('graph/contextMenuRuntime/effects', () => {
  it('applies built-in menu actions through context effects', () => {
    const dependencies = createDependencies();
    const runtime = createContextMenuEffectRuntime(dependencies);

    runtime.handleMenuAction(
      { kind: 'builtin', action: 'open' },
      ['src/app.ts'],
    );

    expect(dependencies.clearCachedFile).toHaveBeenCalledWith('src/app.ts');
    expect(dependencies.postMessage).toHaveBeenCalledWith({
      type: 'OPEN_FILE',
      payload: { path: 'src/app.ts' },
    });
  });

  it('posts plugin menu actions through context effects', () => {
    const dependencies = createDependencies();
    const runtime = createContextMenuEffectRuntime(dependencies);

    runtime.handleMenuAction(
      {
        kind: 'plugin',
        pluginId: 'plugin.test',
        index: 2,
        targetId: 'src/app.ts',
        targetType: 'node',
      },
      ['src/app.ts'],
    );

    expect(dependencies.postMessage).toHaveBeenCalledWith({
      type: 'PLUGIN_CONTEXT_MENU_ACTION',
      payload: {
        pluginId: 'plugin.test',
        index: 2,
        targetId: 'src/app.ts',
        targetType: 'node',
      },
    });
  });
});
