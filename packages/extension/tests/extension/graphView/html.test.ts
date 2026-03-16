import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createGraphViewHtml, createGraphViewNonce } from '../../../src/extension/graphView/html';

describe('graphViewHtml', () => {
  it('creates a 32-character nonce from the allowed character set', () => {
    const nonce = createGraphViewNonce(() => 0);

    expect(nonce).toHaveLength(32);
    expect(nonce).toBe('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  });

  it('uses the full nonce character range when random values approach one', () => {
    const nonce = createGraphViewNonce(() => 0.999999);

    expect(nonce).toBe('99999999999999999999999999999999');
  });

  it('builds the webview HTML with script, style, and CSP values', () => {
    const webview = {
      cspSource: 'vscode-webview://test',
      asWebviewUri: vi.fn((uri: vscode.Uri) => `webview:${uri.fsPath}`),
    };

    const html = createGraphViewHtml(
      vscode.Uri.file('/test/extension'),
      webview as unknown as vscode.Webview,
      'nonce-value'
    );

    expect(html).toContain("script-src 'nonce-nonce-value'");
    expect(html).toContain('webview:/test/extension/dist/webview/index.js');
    expect(html).toContain('webview:/test/extension/dist/webview/index.css');
    expect(html).toContain('<div id="root"></div>');
  });
});
