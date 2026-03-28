import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  getGraphViewLocalResourceRoots,
  getGraphViewUriKey,
  normalizeGraphViewExtensionUri,
  resolveGraphViewAssetPath,
} from '../../../src/extension/graphView/resources';

describe('graphViewResources', () => {
  it('passes through absolute web URLs unchanged', () => {
    expect(
      resolveGraphViewAssetPath(
        'https://example.com/plugin.js',
        vscode.Uri.file('/test/extension'),
        new Map(),
        undefined
      )
    ).toBe('https://example.com/plugin.js');
  });

  it('does not treat embedded protocol text as an already-resolved URL', () => {
    const result = resolveGraphViewAssetPath(
      'dist/http://plugin.js',
      vscode.Uri.file('/test/extension'),
      new Map(),
      undefined
    );

    expect(result).toBe('/test/extension/dist/http://plugin.js');
  });

  it('resolves relative plugin assets against the registering extension root', () => {
    const webview = {
      asWebviewUri: vi.fn((uri: vscode.Uri) => `webview:${uri.fsPath}`),
    };

    const result = resolveGraphViewAssetPath(
      'dist/webview/plugin.js',
      vscode.Uri.file('/test/extension'),
      new Map([['plugin.test', vscode.Uri.file('/test/external-extension')]]),
      webview as unknown as vscode.Webview,
      'plugin.test'
    );

    expect(result).toBe('webview:/test/external-extension/dist/webview/plugin.js');
  });

  it('falls back to the file URI string when no webview is available', () => {
    const result = resolveGraphViewAssetPath(
      'dist/webview/plugin.js',
      vscode.Uri.file('/test/extension'),
      new Map(),
      undefined
    );

    expect(result).toContain('/test/extension/dist/webview/plugin.js');
  });

  it('falls back to object path-like values when a webview URI cannot stringify cleanly', () => {
    const webview = {
      asWebviewUri: vi.fn(() => ({
        toString: () => '[object Object]',
        path: '/converted/plugin.js',
      })),
    };

    const result = resolveGraphViewAssetPath(
      'dist/webview/plugin.js',
      vscode.Uri.file('/test/extension'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    expect(result).toBe('/converted/plugin.js');
  });

  it('returns string webview URIs without further coercion', () => {
    const webview = {
      asWebviewUri: vi.fn(() => 'webview://resolved.js'),
    };

    const result = resolveGraphViewAssetPath(
      'dist/webview/plugin.js',
      vscode.Uri.file('/test/extension'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    expect(result).toBe('webview://resolved.js');
  });

  it('returns useful stringified URIs from webview objects', () => {
    const webview = {
      asWebviewUri: vi.fn(() => ({
        toString: () => 'webview://resolved.css',
      })),
    };

    const result = resolveGraphViewAssetPath(
      'dist/webview/plugin.css',
      vscode.Uri.file('/test/extension'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    expect(result).toBe('webview://resolved.css');
  });

  it('deduplicates extension, plugin, and workspace resource roots', () => {
    const extensionUri = vscode.Uri.file('/test/extension');
    const roots = getGraphViewLocalResourceRoots(
      extensionUri,
      new Map([
        ['plugin.same', extensionUri],
        ['plugin.external', vscode.Uri.file('/test/external-extension')],
      ]),
      [
        { uri: vscode.Uri.file('/test/workspace') },
        { uri: vscode.Uri.file('/test/workspace') },
      ]
    );

    expect(roots.map((uri) => uri.fsPath)).toEqual([
      '/test/extension',
      '/test/external-extension',
      '/test/workspace',
    ]);
  });

  it('prefers fsPath over path and string conversion for URI keys', () => {
    expect(
      getGraphViewUriKey({
        fsPath: '/test/fs-path',
        path: '/test/path',
        toString: () => 'uri-text',
      } as unknown as vscode.Uri)
    ).toBe('/test/fs-path');
  });

  it('normalizes string extension roots into VS Code file URIs', () => {
    expect(normalizeGraphViewExtensionUri('/test/external-extension')?.fsPath).toBe(
      '/test/external-extension'
    );
  });

  it('returns existing URIs and preserves undefined extension roots', () => {
    const uri = vscode.Uri.file('/test/external-extension');

    expect(normalizeGraphViewExtensionUri(uri)).toBe(uri);
    expect(normalizeGraphViewExtensionUri(undefined)).toBeUndefined();
  });
});
