import { describe, expect, it } from 'vitest';
import {
  createClipboardEffects,
  createCreateFileEffects,
  createCreateFolderEffects,
  createOptionalClipboardEffects,
  createOptionalSinglePathMessageEffects,
  createPathListMessageEffects,
  createPatternMessageEffects,
  createRefreshEffects,
} from '../../../../src/webview/components/graph/contextActions/messages';
import {
  createFitViewEffects,
  createFocusEffects,
  createLegendPromptEffects,
  createOpenFileEffects,
  createPatternPromptEffects,
} from '../../../../src/webview/components/graph/contextActions/prompts';
import { getBuiltInContextActionEffects } from '../../../../src/webview/components/graph/contextActions/effects';
import { resolveGraphContextActionContext } from '../../../../src/webview/components/graph/contextActions/context';

function nodeContext(targets: string[]) {
  return resolveGraphContextActionContext({ kind: 'node', targets });
}

describe('graph/contextActions/builders', () => {
  it('builds open-file and focus effects', () => {
    expect(createOpenFileEffects(['a.ts', 'b.ts'])).toEqual([
      { kind: 'openFile', path: 'a.ts' },
      { kind: 'openFile', path: 'b.ts' },
    ]);
    expect(createFocusEffects('node-1')).toEqual([{ kind: 'focusNode', nodeId: 'node-1' }]);
    expect(createFocusEffects(undefined)).toEqual([]);
  });

  it('builds single-path and clipboard message effects only when a path exists', () => {
    expect(createOptionalSinglePathMessageEffects('a.ts', 'REVEAL_IN_EXPLORER')).toEqual([
      { kind: 'postMessage', message: { type: 'REVEAL_IN_EXPLORER', payload: { path: 'a.ts' } } },
    ]);
    expect(createOptionalSinglePathMessageEffects(undefined, 'RENAME_FILE')).toEqual([]);

    expect(createClipboardEffects('a.ts')).toEqual([
      { kind: 'postMessage', message: { type: 'COPY_TO_CLIPBOARD', payload: { text: 'a.ts' } } },
    ]);
    expect(createOptionalClipboardEffects('a.ts', (value) => `copy:${value}`)).toEqual([
      { kind: 'postMessage', message: { type: 'COPY_TO_CLIPBOARD', payload: { text: 'copy:a.ts' } } },
    ]);
    expect(createOptionalClipboardEffects(undefined)).toEqual([]);
  });

  it('builds list, prompt, and refresh effects', () => {
    expect(createPathListMessageEffects('DELETE_FILES', ['a.ts'])).toEqual([
      { kind: 'postMessage', message: { type: 'DELETE_FILES', payload: { paths: ['a.ts'] } } },
    ]);
    expect(createPatternMessageEffects(['src/**'])).toEqual([
      { kind: 'postMessage', message: { type: 'ADD_TO_EXCLUDE', payload: { patterns: ['src/**'] } } },
    ]);
    expect(createPatternPromptEffects(['src/**'])).toEqual([
      { kind: 'promptFilterPattern', patterns: ['src/**'] },
    ]);
    expect(createLegendPromptEffects('src/**', '#22c55e', 'node')).toEqual([
      { kind: 'promptLegendRule', pattern: 'src/**', color: '#22c55e', target: 'node' },
    ]);
    expect(createPatternPromptEffects([])).toEqual([]);
    expect(createLegendPromptEffects(undefined, '#22c55e', 'edge')).toEqual([]);
    expect(createRefreshEffects()).toEqual([{ kind: 'postMessage', message: { type: 'REFRESH_GRAPH' } }]);
    expect(createFitViewEffects()).toEqual([{ kind: 'fitView' }]);
    expect(createCreateFileEffects()).toEqual([
      { kind: 'postMessage', message: { type: 'CREATE_FILE', payload: { directory: '.' } } },
    ]);
  });

  it('builds target-aware file and folder creation effects', () => {
    expect(createCreateFileEffects('src')).toEqual([
      { kind: 'postMessage', message: { type: 'CREATE_FILE', payload: { directory: 'src' } } },
    ]);
    expect(createCreateFolderEffects('src')).toEqual([
      { kind: 'postMessage', message: { type: 'CREATE_FOLDER', payload: { directory: 'src' } } },
    ]);

    expect(getBuiltInContextActionEffects('createFile', nodeContext(['src']))).toEqual([
      { kind: 'beginInlineCreate', itemKind: 'file', directory: 'src' },
    ]);
    expect(getBuiltInContextActionEffects('createFolder', nodeContext(['src']))).toEqual([
      { kind: 'beginInlineCreate', itemKind: 'folder', directory: 'src' },
    ]);
    expect(getBuiltInContextActionEffects('createFile', nodeContext([]))).toEqual([
      { kind: 'beginInlineCreate', itemKind: 'file', directory: '.' },
    ]);
  });

  it('maps the synthetic root folder node to the workspace root for creation effects', () => {
    expect(getBuiltInContextActionEffects('createFile', nodeContext(['(root)']))).toEqual([
      { kind: 'beginInlineCreate', itemKind: 'file', directory: '.' },
    ]);
    expect(getBuiltInContextActionEffects('createFolder', nodeContext(['(root)']))).toEqual([
      { kind: 'beginInlineCreate', itemKind: 'folder', directory: '.' },
    ]);
  });
});
