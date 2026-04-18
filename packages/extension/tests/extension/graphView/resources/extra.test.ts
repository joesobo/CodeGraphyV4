/**
 * @fileoverview Additional tests for graphView resources targeting surviving mutants.
 */

import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  normalizeGraphViewExtensionUri,
  resolveGraphViewAssetPath,
  getGraphViewUriKey,
} from '../../../../src/extension/graphView/resources';

describe('resolveGraphViewAssetPath (extra mutant coverage)', () => {
  it('passes through http:// URLs unchanged', () => {
    expect(
      resolveGraphViewAssetPath(
        'http://example.com/asset.js',
        vscode.Uri.file('/ext'),
        new Map(),
        undefined
      )
    ).toBe('http://example.com/asset.js');
  });

  it('passes through ftp:// URLs unchanged', () => {
    expect(
      resolveGraphViewAssetPath(
        'ftp://example.com/file',
        vscode.Uri.file('/ext'),
        new Map(),
        undefined
      )
    ).toBe('ftp://example.com/file');
  });

  it('passes through custom-scheme:// URLs unchanged', () => {
    expect(
      resolveGraphViewAssetPath(
        'vscode-resource://ext/file.js',
        vscode.Uri.file('/ext'),
        new Map(),
        undefined
      )
    ).toBe('vscode-resource://ext/file.js');
  });

  it('resolves relative path against extension URI when no pluginId given', () => {
    const result = resolveGraphViewAssetPath(
      'dist/main.js',
      vscode.Uri.file('/my-extension'),
      new Map(),
      undefined
    );
    expect(result).toContain('/my-extension/dist/main.js');
  });

  it('resolves relative path against plugin URI when pluginId is provided', () => {
    const result = resolveGraphViewAssetPath(
      'dist/plugin.js',
      vscode.Uri.file('/my-extension'),
      new Map([['my-plugin', vscode.Uri.file('/plugin-dir')]]),
      undefined,
      'my-plugin'
    );
    expect(result).toContain('/plugin-dir/dist/plugin.js');
  });

  it('falls back to extension URI when pluginId is not found in the map', () => {
    const result = resolveGraphViewAssetPath(
      'dist/asset.js',
      vscode.Uri.file('/my-extension'),
      new Map(),
      undefined,
      'missing-plugin'
    );
    expect(result).toContain('/my-extension/dist/asset.js');
  });

  it('handles absolute paths by creating a file URI', () => {
    const result = resolveGraphViewAssetPath(
      '/absolute/path/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      undefined
    );
    expect(result).toContain('/absolute/path/file.js');
  });

  it('uses webview.asWebviewUri when webview is provided and returns a useful toString', () => {
    const webview = {
      asWebviewUri: vi.fn(() => ({
        toString: () => 'webview://converted-uri',
      })),
    };
    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );
    expect(result).toBe('webview://converted-uri');
  });

  it('falls back to fsPath when toString returns [object Object]', () => {
    const webview = {
      asWebviewUri: vi.fn(() => ({
        toString: () => '[object Object]',
        fsPath: '/fallback/path.js',
      })),
    };
    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );
    expect(result).toBe('/fallback/path.js');
  });

  it('falls back to path when toString returns empty string', () => {
    const webview = {
      asWebviewUri: vi.fn(() => ({
        toString: () => '',
        path: '/path-value/file.js',
      })),
    };
    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );
    expect(result).toBe('/path-value/file.js');
  });

  it('uses String() conversion when webviewUri has no usable properties', () => {
    const webview = {
      asWebviewUri: vi.fn(() => null),
    };
    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );
    expect(result).toBe('null');
  });

  it('falls back to fsPath when path is undefined', () => {
    const webview = {
      asWebviewUri: vi.fn(() => ({
        toString: () => '[object Object]',
        path: undefined,
        fsPath: '/fs-path/file.js',
      })),
    };
    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );
    expect(result).toBe('/fs-path/file.js');
  });

  it('prefers path over fsPath when both are available', () => {
    const webview = {
      asWebviewUri: vi.fn(() => ({
        toString: () => '[object Object]',
        path: '/path-value',
        fsPath: '/fsPath-value',
      })),
    };
    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );
    expect(result).toBe('/path-value');
  });

  it('returns String(webviewUri) when webviewUri has no toString function', () => {
    const webview = {
      asWebviewUri: vi.fn(() => 42),
    };
    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );
    // 42 is not a string, but typeof check catches it and skips.
    // Then it checks toString which is inherited from Number.prototype.
    // Number.toString() returns '42' which is non-empty and not '[object Object]'
    expect(result).toBe('42');
  });
});

describe('normalizeGraphViewExtensionUri (extra mutant coverage)', () => {
  it('returns undefined for empty string', () => {
    expect(normalizeGraphViewExtensionUri('')).toBeUndefined();
  });

  it('converts a string path to a vscode.Uri', () => {
    const result = normalizeGraphViewExtensionUri('/some/path');
    expect(result).toBeDefined();
    expect(result!.fsPath).toBe('/some/path');
  });

  it('returns the same URI object when given a URI', () => {
    const uri = vscode.Uri.file('/test');
    const result = normalizeGraphViewExtensionUri(uri);
    expect(result).toBe(uri);
  });
});

describe('getGraphViewUriKey (extra mutant coverage)', () => {
  it('prefers fsPath over path', () => {
    const uri = {
      fsPath: '/fs-path',
      path: '/path',
      toString: () => 'text',
    } as unknown as vscode.Uri;
    expect(getGraphViewUriKey(uri)).toBe('/fs-path');
  });

  it('falls back to path when fsPath is undefined', () => {
    const uri = {
      fsPath: undefined,
      path: '/path-value',
      toString: () => 'text',
    } as unknown as vscode.Uri;
    expect(getGraphViewUriKey(uri)).toBe('/path-value');
  });

  it('falls back to toString when both fsPath and path are undefined', () => {
    const uri = {
      fsPath: undefined,
      path: undefined,
      toString: () => 'stringified',
    } as unknown as vscode.Uri;
    expect(getGraphViewUriKey(uri)).toBe('stringified');
  });
});
