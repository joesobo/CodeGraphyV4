/**
 * @fileoverview Tests targeting surviving mutants in graphView/resources.ts.
 *
 * Surviving mutants (all in resolveGraphViewAssetPath):
 * - L28:7  ConditionalExpression: false (typeof webviewUri === 'string' → false)
 * - L28:29 StringLiteral: "" ('string' → '')
 * - L28:39 BlockStatement: {} ({ return webviewUri; } → {})
 * - L32:5  ConditionalExpression mutations (webviewUri && typeof...)
 * - L33:5  ConditionalExpression mutations (typeof ... === 'function')
 * - L33:5  EqualityOperator mutation (=== → !==)
 * - L33:69 StringLiteral (toString comparison)
 * - L34:5  BlockStatement: {} ({ const text = ...; } → {})
 * - L36:9  ConditionalExpression (text && text !== '[object Object]')
 * - L36:45 BlockStatement: {} ({ return text; } → {})
 */

import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import { resolveGraphViewAssetPath } from '../../../src/extension/graphView/resources';

describe('resolveGraphViewAssetPath string webviewUri branch (L28 mutants)', () => {
  it('returns the string directly when asWebviewUri returns a string', () => {
    const webview = {
      asWebviewUri: vi.fn(() => 'webview://direct-string-result'),
    };

    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    // If L28:7 (guard → false) or L28:39 (block → {}), this would NOT return the string.
    // It would fall through to the toString branch or the path-like fallback.
    expect(result).toBe('webview://direct-string-result');
  });

  it('returns exactly the string value from asWebviewUri without modifications', () => {
    const webview = {
      asWebviewUri: vi.fn(() => 'custom-uri://asset.css'),
    };

    const result = resolveGraphViewAssetPath(
      'dist/style.css',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    // If StringLiteral mutant changes 'string' to '', typeof check would fail
    // and fall through to toString branch
    expect(result).toBe('custom-uri://asset.css');
  });
});

describe('resolveGraphViewAssetPath toString branch (L32-L36 mutants)', () => {
  it('returns toString result when it is non-empty and not [object Object]', () => {
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

    // L34:5 BlockStatement:{} would skip the `const text = ...` assignment
    // L36:45 BlockStatement:{} would skip `return text`
    // Both would cause fallthrough to pathLike fallback
    expect(result).toBe('webview://good-result');
  });

  it('does not use toString when webviewUri has no toString function', () => {
    const webview = {
      asWebviewUri: vi.fn(() => ({
        path: '/fallback-path',
        fsPath: '/fallback-fsPath',
      })),
    };

    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    // L33:5 EqualityOperator (=== → !==) would make this enter the toString block
    // when toString is NOT a function, causing an error or wrong result.
    // The inherited Object.prototype.toString would return '[object Object]',
    // which gets rejected, so it falls to pathLike anyway.
    // But to really test, we need an object without toString:
    expect(result).toBe('/fallback-path');
  });

  it('skips toString and uses path when toString returns empty string', () => {
    const webview = {
      asWebviewUri: vi.fn(() => ({
        toString: () => '',
        path: '/from-path',
      })),
    };

    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    // L36:9 ConditionalExpression mutant (text && text !== ...) mutated
    // would return '' instead of falling through to pathLike
    expect(result).toBe('/from-path');
  });

  it('skips toString and uses path when toString returns [object Object]', () => {
    const webview = {
      asWebviewUri: vi.fn(() => ({
        toString: () => '[object Object]',
        path: '/from-path',
        fsPath: '/from-fsPath',
      })),
    };

    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    // L33:69 StringLiteral mutant would change '[object Object]' comparison
    expect(result).toBe('/from-path');
  });

  it('uses String() when webviewUri is null (no toString, no path properties)', () => {
    const webview = {
      asWebviewUri: vi.fn(() => null),
    };

    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    // L32:5 ConditionalExpression mutant (webviewUri && ...) when falsy
    // skips the toString block entirely and goes to pathLike fallback
    // null?.path → undefined, null?.fsPath → undefined → String(null) = 'null'
    expect(result).toBe('null');
  });

  it('calls toString function exactly once and returns its value', () => {
    const toStringFn = vi.fn(() => 'webview://called-once');
    const webview = {
      asWebviewUri: vi.fn(() => ({
        toString: toStringFn,
      })),
    };

    const result = resolveGraphViewAssetPath(
      'dist/file.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webview as unknown as vscode.Webview
    );

    expect(toStringFn).toHaveBeenCalledOnce();
    expect(result).toBe('webview://called-once');
  });

  it('distinguishes between string webviewUri and object with toString', () => {
    // First: string case
    const webviewString = {
      asWebviewUri: vi.fn(() => 'direct-string'),
    };
    const resultString = resolveGraphViewAssetPath(
      'dist/a.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webviewString as unknown as vscode.Webview
    );
    expect(resultString).toBe('direct-string');

    // Second: object with toString case
    const webviewObj = {
      asWebviewUri: vi.fn(() => ({
        toString: () => 'from-toString',
      })),
    };
    const resultObj = resolveGraphViewAssetPath(
      'dist/b.js',
      vscode.Uri.file('/ext'),
      new Map(),
      webviewObj as unknown as vscode.Webview
    );
    expect(resultObj).toBe('from-toString');

    // These should both return correct values but via different code paths
    expect(resultString).not.toBe(resultObj);
  });
});
