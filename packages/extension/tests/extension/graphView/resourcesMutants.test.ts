/**
 * @fileoverview Tests targeting potential mutants in graphView/resources.ts.
 *
 * After simplification, the webviewUri branch uses:
 *   const text = String(webviewUri);
 *   if (text && text !== '[object Object]') return text;
 *   return pathLike?.path ?? pathLike?.fsPath ?? text;
 */

import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import { resolveGraphViewAssetPath } from '../../../src/extension/graphView/resources';

describe('resolveGraphViewAssetPath String(webviewUri) branch', () => {
  it('returns String(webviewUri) when it is a useful string', () => {
    const webview = {
      asWebviewUri: vi.fn(() => ({
        toString: () => 'webview://good-result',
      })),
    };

    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    expect(result).toBe('webview://good-result');
  });

  it('returns String(webviewUri) for a plain string return value', () => {
    const webview = {
      asWebviewUri: vi.fn(() => 'webview://direct-string'),
    };

    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    expect(result).toBe('webview://direct-string');
  });

  it('falls back to path when String(webviewUri) is [object Object]', () => {
    const webview = {
      asWebviewUri: vi.fn(() => ({
        toString: () => '[object Object]',
        path: '/from-path',
      })),
    };

    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    expect(result).toBe('/from-path');
  });

  it('falls back to fsPath when path is undefined', () => {
    const webview = {
      asWebviewUri: vi.fn(() => ({
        toString: () => '[object Object]',
        fsPath: '/from-fsPath',
      })),
    };

    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    expect(result).toBe('/from-fsPath');
  });

  it('returns String(null) when webviewUri is null', () => {
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

  it('returns numeric string for a number webviewUri', () => {
    const webview = {
      asWebviewUri: vi.fn(() => 42),
    };

    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    expect(result).toBe('42');
  });
});
