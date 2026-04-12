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
  it.each([
    'C:\\workspace\\.codegraphy\\settings.json',
    'C:\\workspace\\.codegraphy\\meta.json',
    'C:\\workspace\\.vscode\\settings.json',
    'C:\\workspace\\.vscode\\tasks.json',
    'C:\\workspace\\.vscode\\launch.json',
    'C:\\workspace\\project.code-workspace',
  ])('ignores workspace config and workspace files on Windows paths: %s', (filePath) => {
    expect(shouldIgnoreSaveForGraphRefresh(makeDocument(filePath))).toBe(true);
    expect(shouldIgnoreWorkspaceFileWatcherRefresh(filePath)).toBe(true);
  });

  it.each([
    '/workspace/node_modules/react/index.js',
    '/workspace/dist/app.js',
    '/workspace/build/app.js',
    '/workspace/out/app.js',
    '/workspace/.git/config',
    '/workspace/coverage/report.json',
    '/workspace/assets/app.min.js',
    '/workspace/assets/app.bundle.js',
    '/workspace/assets/app.map',
  ])('ignores graph refresh for excluded workspace artifacts: %s', (filePath) => {
    expect(shouldIgnoreSaveForGraphRefresh(makeDocument(filePath))).toBe(true);
    expect(shouldIgnoreWorkspaceFileWatcherRefresh(filePath)).toBe(true);
  });

  it('returns false for a regular source file', () => {
    expect(shouldIgnoreSaveForGraphRefresh(makeDocument('/workspace/src/app.ts'))).toBe(false);
    expect(shouldIgnoreWorkspaceFileWatcherRefresh('/workspace/src/app.ts')).toBe(false);
  });

  it('returns false when a document has no uri', () => {
    expect(shouldIgnoreSaveForGraphRefresh(makeDocument(undefined))).toBe(false);
  });
});
