import fs from 'fs';
import os from 'os';
import path from 'path';
import * as vscode from 'vscode';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveCssSnippetStylesheets } from '../../../../src/extension/graphView/cssSnippets/resolve';

describe('graphView/cssSnippets/resolve', () => {
  let workspaceRoot: string;
  const warn = vi.fn();
  const webview = {
    asWebviewUri: vi.fn((uri: vscode.Uri): vscode.Uri => ({
      toString: () => `webview:${uri.fsPath}`,
    }) as vscode.Uri),
  };

  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-css-snippets-'));
    fs.mkdirSync(path.join(workspaceRoot, '.codegraphy', 'snippets'), { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, '.codegraphy', 'snippets', 'base.css'), 'body {}');
    fs.writeFileSync(path.join(workspaceRoot, '.codegraphy', 'snippets', 'override.css'), 'body {}');
    fs.writeFileSync(path.join(workspaceRoot, '.codegraphy', 'snippets', 'notes.txt'), 'not css');
    warn.mockReset();
    webview.asWebviewUri.mockClear();
  });

  afterEach(() => {
    fs.rmSync(workspaceRoot, { force: true, recursive: true });
  });

  it('resolves ordered workspace-relative css files to webview stylesheet urls', () => {
    const result = resolveCssSnippetStylesheets({
      snippets: {
        '.codegraphy/snippets/base.css': true,
        '.codegraphy/snippets/disabled.css': false,
        '.codegraphy/snippets/override.css': true,
      },
      warn,
      webview,
      workspaceRoot,
    });

    expect(result).toEqual([
      'webview:' + path.join(workspaceRoot, '.codegraphy', 'snippets', 'base.css'),
      'webview:' + path.join(workspaceRoot, '.codegraphy', 'snippets', 'override.css'),
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns and skips absolute paths, parent traversal, missing files, and non-css files', () => {
    const result = resolveCssSnippetStylesheets({
      snippets: {
        '/tmp/outside.css': true,
        '../shared.css': true,
        '.codegraphy/snippets/missing.css': true,
        '.codegraphy/snippets/notes.txt': true,
        '.codegraphy/snippets/disabled-missing.css': false,
        '.codegraphy/snippets/base.css': true,
      },
      warn,
      webview,
      workspaceRoot,
    });

    expect(result).toEqual([
      'webview:' + path.join(workspaceRoot, '.codegraphy', 'snippets', 'base.css'),
    ]);
    expect(warn.mock.calls.map(call => call[0])).toEqual([
      '[CodeGraphy] CSS snippet ignored because absolute paths are not supported: /tmp/outside.css',
      '[CodeGraphy] CSS snippet ignored because parent traversal is not supported: ../shared.css',
      '[CodeGraphy] CSS snippet not found: .codegraphy/snippets/missing.css',
      '[CodeGraphy] CSS snippet ignored because it is not a CSS file: .codegraphy/snippets/notes.txt',
    ]);
  });
});
