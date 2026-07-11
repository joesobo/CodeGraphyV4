import { describe, expect, it, vi } from 'vitest';
import type { GraphContextMenuRuntimeDependencies } from '../../../../src/webview/components/graph/contextMenuRuntime/controller';
import { createContextMenuEffectRuntime } from '../../../../src/webview/components/graph/contextMenuRuntime/effects';
import { resolveGraphContextActionContext } from '../../../../src/webview/components/graph/contextActions/context';

function nodeContext(targets: string[]) {
  return resolveGraphContextActionContext({ kind: 'node', targets });
}

function createDependencies(
  overrides: Partial<GraphContextMenuRuntimeDependencies> = {},
): Pick<
  GraphContextMenuRuntimeDependencies,
  'clearCachedFile' | 'fitView' | 'focusNode' | 'openFilterPatternPrompt' | 'openLegendRulePrompt' | 'postMessage'
  | 'refreshContextSelection'
  | 'toggleFavoritesOptimistically'
> {
  return {
    clearCachedFile: vi.fn(),
    fitView: vi.fn(),
    focusNode: vi.fn(),
    openFilterPatternPrompt: vi.fn(),
    openLegendRulePrompt: vi.fn(),
    postMessage: vi.fn(),
    refreshContextSelection: vi.fn(),
    toggleFavoritesOptimistically: vi.fn(),
    ...overrides,
  };
}

describe('graph/contextMenuRuntime/effects', () => {
  it('applies built-in menu actions through context effects', () => {
    const dependencies = createDependencies();
    const runtime = createContextMenuEffectRuntime(dependencies);

    runtime.handleMenuAction(
      { kind: 'builtin', action: 'open' },
      nodeContext(['src/app.ts']),
    );

    expect(dependencies.clearCachedFile).toHaveBeenCalledWith('src/app.ts');
    expect(dependencies.postMessage).toHaveBeenCalledWith({
      type: 'OPEN_FILE',
      payload: { path: 'src/app.ts' },
    });
  });

  it('applies an armed comparison action for a node selection', () => {
    const dependencies = createDependencies();
    const runtime = createContextMenuEffectRuntime(dependencies);

    runtime.handleMenuAction(
      {
        kind: 'builtin',
        action: 'compareWithSelected',
        comparisonPath: 'src/app.ts',
      },
      nodeContext(['src/next.ts']),
    );

    expect(dependencies.postMessage).toHaveBeenCalledWith({
      type: 'COMPARE_FILES',
      payload: { leftPath: 'src/app.ts', rightPath: 'src/next.ts' },
    });
  });

  it('applies file clipboard actions for a node selection', () => {
    const dependencies = createDependencies();
    const runtime = createContextMenuEffectRuntime(dependencies);

    runtime.handleMenuAction(
      { kind: 'builtin', action: 'copyFiles' },
      nodeContext(['src/app.ts']),
    );

    expect(dependencies.postMessage).toHaveBeenCalledWith({
      type: 'COPY_FILES',
      payload: { paths: ['src/app.ts'] },
    });
  });

  it('applies paste for the synthetic root selection', () => {
    const dependencies = createDependencies();
    const runtime = createContextMenuEffectRuntime(dependencies);

    runtime.handleMenuAction(
      { kind: 'builtin', action: 'pasteFiles' },
      nodeContext(['(root)']),
    );

    expect(dependencies.postMessage).toHaveBeenCalledWith({
      type: 'PASTE_FILES',
      payload: { directory: '.' },
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
      nodeContext(['src/app.ts']),
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
      nodeContext(['README.md']),
    );

    expect(dependencies.openFilterPatternPrompt).toHaveBeenCalledWith(['README.md']);
    expect(dependencies.postMessage).not.toHaveBeenCalled();
  });

  it('refreshes the context selection after posting the extension favorite toggle message', () => {
    const dependencies = createDependencies();
    const runtime = createContextMenuEffectRuntime(dependencies);

    runtime.handleMenuAction(
      { kind: 'builtin', action: 'toggleFavorite' },
      nodeContext(['src/app.ts']),
    );

    expect(dependencies.postMessage).toHaveBeenCalledWith({
      type: 'TOGGLE_FAVORITE',
      payload: { paths: ['src/app.ts'] },
    });
    expect(dependencies.refreshContextSelection).toHaveBeenCalledOnce();
  });

  it('skips built-in menu actions that are invalid for the execution selection', () => {
    const dependencies = createDependencies();
    const runtime = createContextMenuEffectRuntime(dependencies);

    runtime.handleMenuAction(
      { kind: 'builtin', action: 'createFile' },
      nodeContext(['src/app.ts']),
    );

    expect(dependencies.postMessage).not.toHaveBeenCalled();
  });

  it('skips plugin menu actions that are invalid for the execution selection', () => {
    const dependencies = createDependencies();
    const runtime = createContextMenuEffectRuntime(dependencies);

    runtime.handleMenuAction(
      {
        kind: 'plugin',
        pluginId: 'plugin.test',
        index: 2,
        targetId: 'src/app.ts->src/util.ts',
        targetType: 'edge',
      },
      nodeContext(['src/app.ts']),
    );

    expect(dependencies.postMessage).not.toHaveBeenCalled();
  });

  it('opens the legend prompt for add-node-legend actions', () => {
    const dependencies = createDependencies();
    const runtime = createContextMenuEffectRuntime(dependencies);

    runtime.handleMenuAction(
      { kind: 'builtin', action: 'addNodeLegend' },
      nodeContext(['src/Helper.java']),
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
        nodeContext(['README.md']),
      ),
    ).not.toThrow();
    expect(() =>
      runtime.handleMenuAction(
        { kind: 'builtin', action: 'addNodeLegend' },
        nodeContext(['src/Helper.java']),
      ),
    ).not.toThrow();
  });
});
