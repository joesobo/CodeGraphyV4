import { describe, it, expect } from 'vitest';
import * as vscode from 'vscode';
import {
  getGraphViewUriKey,
  getGraphViewLocalResourceRoots,
} from '../../../src/extension/graphView/resourceRoots';

describe('graphView/resourceRoots', () => {
  describe('getGraphViewUriKey', () => {
    it('prefers fsPath over path and string conversion', () => {
      expect(
        getGraphViewUriKey({
          fsPath: '/test/fs-path',
          path: '/test/path',
          toString: () => 'uri-text',
        } as unknown as vscode.Uri)
      ).toBe('/test/fs-path');
    });

    it('falls back to path when fsPath is not available', () => {
      expect(
        getGraphViewUriKey({
          path: '/test/path',
          toString: () => 'uri-text',
        } as unknown as vscode.Uri)
      ).toBe('/test/path');
    });

    it('falls back to toString when neither fsPath nor path is available', () => {
      expect(
        getGraphViewUriKey({
          toString: () => 'uri-text',
        } as unknown as vscode.Uri)
      ).toBe('uri-text');
    });
  });

  describe('getGraphViewLocalResourceRoots', () => {
    it('includes the extension root', () => {
      const extensionUri = vscode.Uri.file('/test/extension');
      const roots = getGraphViewLocalResourceRoots(extensionUri, new Map(), undefined);

      expect(roots.map(uri => uri.fsPath)).toContain('/test/extension');
    });

    it('includes plugin extension roots', () => {
      const extensionUri = vscode.Uri.file('/test/extension');
      const roots = getGraphViewLocalResourceRoots(
        extensionUri,
        new Map([['plugin.external', vscode.Uri.file('/test/external-extension')]]),
        undefined
      );

      expect(roots.map(uri => uri.fsPath)).toContain('/test/external-extension');
    });

    it('includes workspace folder roots', () => {
      const extensionUri = vscode.Uri.file('/test/extension');
      const roots = getGraphViewLocalResourceRoots(
        extensionUri,
        new Map(),
        [{ uri: vscode.Uri.file('/test/workspace') }]
      );

      expect(roots.map(uri => uri.fsPath)).toContain('/test/workspace');
    });

    it('deduplicates roots that share the same URI key', () => {
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

      expect(roots.map(uri => uri.fsPath)).toEqual([
        '/test/extension',
        '/test/external-extension',
        '/test/workspace',
      ]);
    });

    it('handles undefined workspaceFolders gracefully', () => {
      const extensionUri = vscode.Uri.file('/test/extension');
      const roots = getGraphViewLocalResourceRoots(extensionUri, new Map(), undefined);

      expect(roots).toHaveLength(1);
    });
  });
});
