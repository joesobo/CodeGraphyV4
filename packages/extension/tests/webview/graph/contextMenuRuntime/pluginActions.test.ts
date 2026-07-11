import { describe, expect, it, vi } from 'vitest';
import type { GraphContextMenuRuntimeDependencies } from '../../../../src/webview/components/graph/contextMenuRuntime/controller';
import { createContextMenuEffectRuntime } from '../../../../src/webview/components/graph/contextMenuRuntime/effects';
import { resolveGraphContextActionContext } from '../../../../src/webview/components/graph/contextActions/context';

function backgroundContext() {
  return resolveGraphContextActionContext({ kind: 'background', targets: [] });
}

function edgeContext(edgeId: string) {
  return resolveGraphContextActionContext({
    kind: 'edge',
    edgeId,
    targets: ['src/app.ts', 'src/util.ts'],
  });
}

function nodeContext(targets: string[]) {
  return resolveGraphContextActionContext({ kind: 'node', targets });
}

function createDependencies(): Pick<
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
  };
}

describe('graph/contextMenuRuntime/pluginActions', () => {
  it('runs graph view plugin actions for matching background contexts', () => {
    const runtime = createContextMenuEffectRuntime(createDependencies());
    const run = vi.fn();

    runtime.handleMenuAction(
      {
        kind: 'graphViewPlugin',
        pluginId: 'plugin.test',
        contributionId: 'background-action',
        context: {
          selectedEdgeIds: [],
          selectedNodeIds: [],
          target: { kind: 'background' },
          timelineActive: false,
        },
        run,
      },
      backgroundContext(),
    );

    expect(run).toHaveBeenCalledOnce();
  });

  it('runs graph view plugin actions for matching edge contexts', () => {
    const runtime = createContextMenuEffectRuntime(createDependencies());
    const run = vi.fn();

    runtime.handleMenuAction(
      {
        kind: 'graphViewPlugin',
        pluginId: 'plugin.test',
        contributionId: 'edge-action',
        context: {
          selectedEdgeIds: ['src/app.ts->src/util.ts'],
          selectedNodeIds: [],
          target: { kind: 'edge' },
          timelineActive: false,
        },
        run,
      },
      edgeContext('src/app.ts->src/util.ts'),
    );

    expect(run).toHaveBeenCalledOnce();
  });

  it('runs graph view plugin actions for matching node contexts', () => {
    const runtime = createContextMenuEffectRuntime(createDependencies());
    const run = vi.fn();

    runtime.handleMenuAction(
      {
        kind: 'graphViewPlugin',
        pluginId: 'plugin.test',
        contributionId: 'node-action',
        context: {
          selectedEdgeIds: [],
          selectedNodeIds: ['src/app.ts', 'src/util.ts'],
          target: { kind: 'node', nodeTypes: ['file'] },
          timelineActive: false,
        },
        run,
      },
      nodeContext(['src/app.ts', 'src/util.ts']),
    );

    expect(run).toHaveBeenCalledOnce();
  });

  it('skips graph view plugin actions that no longer match the execution context', () => {
    const runtime = createContextMenuEffectRuntime(createDependencies());
    const run = vi.fn();

    runtime.handleMenuAction(
      {
        kind: 'graphViewPlugin',
        pluginId: 'plugin.test',
        contributionId: 'node-action',
        context: {
          selectedEdgeIds: [],
          selectedNodeIds: ['src/old.ts'],
          target: { kind: 'node', nodeTypes: ['file'] },
          timelineActive: false,
        },
        run,
      },
      nodeContext(['src/app.ts']),
    );

    expect(run).not.toHaveBeenCalled();
  });
});
