import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createGraphViewHtml, createGraphViewNonce } from '../../../../src/extension/graphView/webview/html';

describe('graphView/webview/html', () => {
  it('creates a 32-character nonce from the allowed character set', () => {
    const nonce = createGraphViewNonce(() => 0);

    expect(nonce).toHaveLength(32);
    expect(nonce).toBe('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  });

  it('uses the full nonce character range when random values approach one', () => {
    const nonce = createGraphViewNonce(() => 0.999999);

    expect(nonce).toBe('99999999999999999999999999999999');
  });

  it('builds the graph webview HTML with script, style, CSP, and view kind values', () => {
    const webview = {
      cspSource: 'vscode-webview://test',
      asWebviewUri: vi.fn((uri: vscode.Uri) => `webview:${uri.fsPath}`),
    };

    const html = createGraphViewHtml(
      vscode.Uri.file('/test/extension'),
      webview as unknown as vscode.Webview,
      'nonce-value',
      'graph',
    );

    expect(html).toContain("script-src 'nonce-nonce-value'");
    expect(html).toContain("img-src vscode-webview://test data:");
    expect(html).toContain('webview:/test/extension/dist/webview/index.js');
    expect(html).toContain('webview:/test/extension/dist/webview/index.css');
    expect(html).toContain('data-codegraphy-view="graph"');
    expect(html).toContain('<div id="root"></div>');
  });

  it('marks the timeline webview html with the timeline view kind', () => {
    const html = createGraphViewHtml(
      vscode.Uri.file('/test/extension'),
      {
        cspSource: 'vscode-webview://test',
        asWebviewUri: vi.fn((uri: vscode.Uri) => `webview:${uri.fsPath}`),
      } as unknown as vscode.Webview,
      'nonce-value',
      'timeline',
    );

    expect(html).toContain('data-codegraphy-view="timeline"');
  });
});
