import { describe, expect, it } from 'vitest';
import {
  getBuiltInContextActionEffects,
  getGraphContextActionEffects,
} from '../../../../src/webview/components/graph/contextActions/effects';
import { resolveGraphContextActionContext } from '../../../../src/webview/components/graph/contextActions/context';

function nodeContext(targets: string[]) {
  return resolveGraphContextActionContext({ kind: 'node', targets });
}

function edgeContext(targets: string[]) {
  return resolveGraphContextActionContext({ kind: 'edge', edgeId: targets.join('->'), targets });
}

describe('graph/contextActions/effects', () => {
  it('creates one open-file effect per selected path', () => {
    expect(getBuiltInContextActionEffects('open', nodeContext(['src/app.ts', 'src/utils.ts']))).toEqual([
      { kind: 'openFile', path: 'src/app.ts' },
      { kind: 'openFile', path: 'src/utils.ts' },
    ]);
  });

  it('posts selected paths through the open-to-side host route', () => {
    expect(getBuiltInContextActionEffects(
      'openToSide',
      nodeContext(['src/app.ts', 'src/utils.ts']),
    )).toEqual([{
      kind: 'postMessage',
      message: {
        type: 'OPEN_FILES_TO_SIDE',
        payload: { paths: ['src/app.ts', 'src/utils.ts'] },
      },
    }]);
  });

  it('posts the selected file through the close-editor host route', () => {
    expect(getBuiltInContextActionEffects('closeEditor', nodeContext(['src/app.ts']))).toEqual([{
      kind: 'postMessage',
      message: { type: 'CLOSE_FILE_EDITOR', payload: { path: 'src/app.ts' } },
    }]);
  });

  it('posts the selected file through the open-with host route', () => {
    expect(getBuiltInContextActionEffects('openWith', nodeContext(['src/app.ts']))).toEqual([{
      kind: 'postMessage',
      message: { type: 'OPEN_FILE_WITH', payload: { path: 'src/app.ts' } },
    }]);
  });

  it('uses the first selected path for reveal actions', () => {
    expect(getBuiltInContextActionEffects('reveal', nodeContext(['src/app.ts', 'src/utils.ts']))).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'REVEAL_IN_EXPLORER', payload: { path: 'src/app.ts' } },
      },
    ]);
  });

  it('returns no effect when reveal has no selected path', () => {
    expect(getBuiltInContextActionEffects('reveal', nodeContext([]))).toEqual([]);
  });

  it('copies all relative paths joined by newlines', () => {
    expect(getBuiltInContextActionEffects('copyRelative', nodeContext(['a.ts', 'b.ts']))).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'COPY_TO_CLIPBOARD', payload: { text: 'a.ts\nb.ts' } },
      },
    ]);
  });

  it('creates file clipboard messages for cut, copy, and paste', () => {
    expect(getBuiltInContextActionEffects('cutFiles', nodeContext(['a.ts', 'b.ts']))).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'CUT_FILES', payload: { paths: ['a.ts', 'b.ts'] } },
      },
    ]);
    expect(getBuiltInContextActionEffects('copyFiles', nodeContext(['a.ts', 'b.ts']))).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'COPY_FILES', payload: { paths: ['a.ts', 'b.ts'] } },
      },
    ]);
    expect(getBuiltInContextActionEffects('pasteFiles', nodeContext(['src']))).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'PASTE_FILES', payload: { directory: 'src' } },
      },
    ]);
  });

  it('prefixes the first path for absolute path copies', () => {
    expect(getBuiltInContextActionEffects('copyAbsolute', nodeContext(['a.ts', 'b.ts']))).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'COPY_TO_CLIPBOARD', payload: { text: 'absolute:a.ts' } },
      },
    ]);
  });

  it('returns no effect when absolute path copy has no selected path', () => {
    expect(getBuiltInContextActionEffects('copyAbsolute', nodeContext([]))).toEqual([]);
  });

  it('returns no effect when edge source copy has no selected path', () => {
    expect(getBuiltInContextActionEffects('copyEdgeSource', edgeContext([]))).toEqual([]);
  });

  it('opens edge source and target endpoints independently', () => {
    expect(getBuiltInContextActionEffects('openEdgeSource', edgeContext(['from.ts', 'to.ts']))).toEqual([
      { kind: 'openFile', path: 'from.ts' },
    ]);
    expect(getBuiltInContextActionEffects('openEdgeTarget', edgeContext(['from.ts', 'to.ts']))).toEqual([
      { kind: 'openFile', path: 'to.ts' },
    ]);
  });

  it('copies edge target only when a second path exists', () => {
    expect(getBuiltInContextActionEffects('copyEdgeTarget', edgeContext(['from.ts']))).toEqual([]);
    expect(getBuiltInContextActionEffects('copyEdgeTarget', edgeContext(['from.ts', 'to.ts']))).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'COPY_TO_CLIPBOARD', payload: { text: 'to.ts' } },
      },
    ]);
  });

  it('creates a focus effect for the first selected path', () => {
    expect(getBuiltInContextActionEffects('focus', nodeContext(['src/app.ts']))).toEqual([
      { kind: 'focusNode', nodeId: 'src/app.ts' },
    ]);
  });

  it('creates a filter prompt effect for a single selected path', () => {
    expect(getBuiltInContextActionEffects('addToFilter', nodeContext(['README.md']))).toEqual([
      { kind: 'promptFilterPattern', patterns: ['README.md'] },
    ]);
  });

  it('posts the selected folder through the find-in-folder host route', () => {
    expect(getBuiltInContextActionEffects('findInFolder', nodeContext(['src']))).toEqual([{
      kind: 'postMessage',
      message: { type: 'FIND_IN_FOLDER', payload: { path: 'src' } },
    }]);
  });

  it('creates a filter prompt effect for multi-select add-to-filter', () => {
    expect(getBuiltInContextActionEffects('addToFilter', nodeContext(['a.ts', 'b.ts']))).toEqual([
      { kind: 'promptFilterPattern', patterns: ['a.ts', 'b.ts'] },
    ]);
  });

  it('creates a legend prompt effect for a single selected path', () => {
    expect(getBuiltInContextActionEffects('addNodeLegend', nodeContext(['src/Helper.java']))).toEqual([
      { kind: 'promptLegendRule', color: '#808080', pattern: 'src/Helper.java', target: 'node' },
    ]);
  });

  it('returns no effect when focus has no selected path', () => {
    expect(getBuiltInContextActionEffects('focus', nodeContext([]))).toEqual([]);
  });

  it('returns no effect when rename has no selected path', () => {
    expect(getBuiltInContextActionEffects('rename', nodeContext([]))).toEqual([]);
  });

  it('creates a fit-view effect', () => {
    expect(getBuiltInContextActionEffects('fitView', nodeContext(['src/app.ts']))).toEqual([
      { kind: 'fitView' },
    ]);
  });

  it('creates plugin action messages for plugin menu items', () => {
    const effects = getGraphContextActionEffects({
      kind: 'plugin',
      pluginId: 'plugin.test',
      index: 2,
      targetId: 'src/app.ts',
      targetType: 'node',
    }, nodeContext(['src/app.ts']));

    expect(effects).toHaveLength(1);
    expect(effects).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'PLUGIN_CONTEXT_MENU_ACTION',
          payload: {
            pluginId: 'plugin.test',
            index: 2,
            targetId: 'src/app.ts',
            targetType: 'node',
          },
        },
      },
    ]);
  });
});
