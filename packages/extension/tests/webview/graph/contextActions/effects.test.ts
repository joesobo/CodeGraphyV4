import { describe, expect, it } from 'vitest';
import {
  getBuiltInContextActionEffects,
  getGraphContextActionEffects,
} from '../../../../src/webview/components/graph/contextActions/effects';

describe('graph/contextActions/effects', () => {
  it('creates one open-file effect per selected path', () => {
    expect(getBuiltInContextActionEffects('open', ['src/app.ts', 'src/utils.ts'])).toEqual([
      { kind: 'openFile', path: 'src/app.ts' },
      { kind: 'openFile', path: 'src/utils.ts' },
    ]);
  });

  it('uses the first selected path for reveal actions', () => {
    expect(getBuiltInContextActionEffects('reveal', ['src/app.ts', 'src/utils.ts'])).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'REVEAL_IN_EXPLORER', payload: { path: 'src/app.ts' } },
      },
    ]);
  });

  it('returns no effect when reveal has no selected path', () => {
    expect(getBuiltInContextActionEffects('reveal', [])).toEqual([]);
  });

  it('copies all relative paths joined by newlines', () => {
    expect(getBuiltInContextActionEffects('copyRelative', ['a.ts', 'b.ts'])).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'COPY_TO_CLIPBOARD', payload: { text: 'a.ts\nb.ts' } },
      },
    ]);
  });

  it('prefixes the first path for absolute path copies', () => {
    expect(getBuiltInContextActionEffects('copyAbsolute', ['a.ts', 'b.ts'])).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'COPY_TO_CLIPBOARD', payload: { text: 'absolute:a.ts' } },
      },
    ]);
  });

  it('returns no effect when absolute path copy has no selected path', () => {
    expect(getBuiltInContextActionEffects('copyAbsolute', [])).toEqual([]);
  });

  it('returns no effect when edge source copy has no selected path', () => {
    expect(getBuiltInContextActionEffects('copyEdgeSource', [])).toEqual([]);
  });

  it('copies edge target only when a second path exists', () => {
    expect(getBuiltInContextActionEffects('copyEdgeTarget', ['from.ts'])).toEqual([]);
    expect(getBuiltInContextActionEffects('copyEdgeTarget', ['from.ts', 'to.ts'])).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'COPY_TO_CLIPBOARD', payload: { text: 'to.ts' } },
      },
    ]);
  });

  it('creates a focus effect for the first selected path', () => {
    expect(getBuiltInContextActionEffects('focus', ['src/app.ts'])).toEqual([
      { kind: 'focusNode', nodeId: 'src/app.ts' },
    ]);
  });

  it('creates a filter prompt effect for a single selected path', () => {
    expect(getBuiltInContextActionEffects('addToFilter', ['README.md'])).toEqual([
      { kind: 'promptFilterPattern', pattern: 'README.md' },
    ]);
  });

  it('falls back to immediate filter messages for multi-select add-to-filter', () => {
    expect(getBuiltInContextActionEffects('addToFilter', ['a.ts', 'b.ts'])).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'ADD_TO_EXCLUDE', payload: { patterns: ['a.ts', 'b.ts'] } },
      },
    ]);
  });

  it('creates a legend prompt effect for a single selected path', () => {
    expect(getBuiltInContextActionEffects('addNodeLegend', ['src/Helper.java'])).toEqual([
      { kind: 'promptLegendRule', color: '#808080', pattern: 'src/Helper.java', target: 'node' },
    ]);
  });

  it('returns no effect when focus has no selected path', () => {
    expect(getBuiltInContextActionEffects('focus', [])).toEqual([]);
  });

  it('returns no effect when rename has no selected path', () => {
    expect(getBuiltInContextActionEffects('rename', [])).toEqual([]);
  });

  it('creates a fit-view effect', () => {
    expect(getBuiltInContextActionEffects('fitView', ['src/app.ts'])).toEqual([
      { kind: 'fitView' },
    ]);
  });

  it('creates plugin action messages for plugin menu items', () => {
    expect(getGraphContextActionEffects({
      kind: 'plugin',
      pluginId: 'plugin.test',
      index: 2,
      targetId: 'src/app.ts',
      targetType: 'node',
    }, ['src/app.ts'])).toEqual([
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
