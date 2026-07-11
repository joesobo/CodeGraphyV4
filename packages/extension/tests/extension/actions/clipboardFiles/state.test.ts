import { describe, expect, it } from 'vitest';
import type * as vscode from 'vscode';
import { ClipboardFilesState } from '../../../../src/extension/actions/clipboardFiles/state';

const workspace = { toString: () => 'file:///workspace' } as vscode.Uri;

describe('actions/clipboardFiles/state', () => {
  it('clones staged paths into a clipboard snapshot', () => {
    const state = new ClipboardFilesState();
    const paths = ['a.ts'];

    state.stage('copy', paths, workspace);
    paths.push('b.ts');

    expect(state.read()?.paths).toEqual(['a.ts']);
  });

  it('keeps copied files available after a completed paste', () => {
    const state = new ClipboardFilesState();
    state.stage('copy', ['a.ts'], workspace);
    const snapshot = state.read()!;

    state.completePaste(snapshot);

    expect(state.read()).toBe(snapshot);
  });

  it('clears cut files only after their matching paste completes', () => {
    const state = new ClipboardFilesState();
    state.stage('cut', ['a.ts'], workspace);
    const snapshot = state.read()!;

    state.completePaste({ ...snapshot });
    expect(state.read()).toBe(snapshot);

    state.completePaste(snapshot);
    expect(state.read()).toBeUndefined();
  });
});
