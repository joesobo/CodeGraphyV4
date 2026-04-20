import { describe, expect, it, vi } from 'vitest';
import type { GraphContextMenuRuntimeDependencies } from '../../../../src/webview/components/graph/contextMenuRuntime/controller';
import { createContextMenuEffectRuntime } from '../../../../src/webview/components/graph/contextMenuRuntime/effects';

function createDependencies(
  overrides: Partial<GraphContextMenuRuntimeDependencies> = {},
): Pick<
  GraphContextMenuRuntimeDependencies,
  'clearCachedFile' | 'fitView' | 'focusNode' | 'openFilterPatternPrompt' | 'openLegendRulePrompt' | 'postMessage'
> {
  return {
    clearCachedFile: vi.fn(),
    fitView: vi.fn(),
    focusNode: vi.fn(),
    openFilterPatternPrompt: vi.fn(),
    openLegendRulePrompt: vi.fn(),
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

  it('opens the filter prompt for single-node add-to-filter actions', () => {
    const dependencies = createDependencies();
    const runtime = createContextMenuEffectRuntime(dependencies);

    runtime.handleMenuAction(
      { kind: 'builtin', action: 'addToFilter' },
      ['README.md'],
    );

    expect(dependencies.openFilterPatternPrompt).toHaveBeenCalledWith(['README.md']);
    expect(dependencies.postMessage).not.toHaveBeenCalled();
  });

  it('opens the legend prompt for add-node-legend actions', () => {
    const dependencies = createDependencies();
    const runtime = createContextMenuEffectRuntime(dependencies);

    runtime.handleMenuAction(
      { kind: 'builtin', action: 'addNodeLegend' },
      ['src/Helper.java'],
    );

    expect(dependencies.openLegendRulePrompt).toHaveBeenCalledWith({
      color: '#808080',
      pattern: 'src/Helper.java',
      target: 'node',
    });
  });

  it('tolerates missing prompt callbacks for filter and legend actions', () => {
    const dependencies = createDependencies({
      openFilterPatternPrompt: undefined,
      openLegendRulePrompt: undefined,
    });
    const runtime = createContextMenuEffectRuntime(dependencies);

    expect(() =>
      runtime.handleMenuAction(
        { kind: 'builtin', action: 'addToFilter' },
        ['README.md'],
      ),
    ).not.toThrow();
    expect(() =>
      runtime.handleMenuAction(
        { kind: 'builtin', action: 'addNodeLegend' },
        ['src/Helper.java'],
      ),
    ).not.toThrow();
  });
});
