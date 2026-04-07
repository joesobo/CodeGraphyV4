import type * as vscode from 'vscode';
import { describe, expect, it } from 'vitest';
import {
  shouldIgnoreSaveForGraphRefresh,
  shouldIgnoreWorkspaceFileWatcherRefresh,
} from '../../../src/extension/workspaceFiles/ignore';

function makeDocument(fsPath?: string): vscode.TextDocument {
  return {
    uri: fsPath === undefined ? undefined : { fsPath, scheme: 'file' },
  } as never;
}

describe('extension/workspaceFiles/ignore', () => {
  it('ignores Windows-style workspace config paths after normalization', () => {
    expect(
      shouldIgnoreSaveForGraphRefresh(makeDocument('C:\\workspace\\.vscode\\settings.json')),
    ).toBe(true);
    expect(
      shouldIgnoreWorkspaceFileWatcherRefresh('C:\\workspace\\.vscode\\settings.json'),
    ).toBe(true);
  });

  it('returns false when a document has no uri', () => {
    expect(shouldIgnoreSaveForGraphRefresh(makeDocument(undefined))).toBe(false);
  });
});
