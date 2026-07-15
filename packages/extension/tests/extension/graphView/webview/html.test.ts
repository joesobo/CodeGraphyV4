import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { createGraphViewHtml, createGraphViewNonce } from '../../../../src/extension/graphView/webview/html';

describe('graphView/webview/html', () => {
  it('creates a 32-character nonce from the allowed character set', () => {
    expect(createGraphViewNonce(() => 0)).toBe('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  });

  it('uses the full nonce character range when random values approach one', () => {
    expect(createGraphViewNonce(() => 0.999999)).toBe('99999999999999999999999999999999');
  });

  it('builds graph-only webview HTML with script, style, CSP, and theme', () => {
    const webview = {
      cspSource: 'vscode-webview://test',
      asWebviewUri: vi.fn((uri: vscode.Uri) => `webview:${uri.fsPath}`),
    };

    const html = createGraphViewHtml(
      vscode.Uri.file('/test/extension'),
      webview as unknown as vscode.Webview,
      'nonce-value',
      'light',
    );

    expect(html).toContain(
      "script-src vscode-webview://test 'nonce-nonce-value' 'wasm-unsafe-eval'",
    );
    expect(html).toContain('worker-src vscode-webview://test blob:');
    expect(html).toContain("img-src vscode-webview://test data:");
    expect(html).toContain('webview:/test/extension/dist/webview/index.js');
    expect(html).toContain('webview:/test/extension/dist/webview/index.css');
    expect(html).toContain('<script type="module" nonce="nonce-value" src="webview:/test/extension/dist/webview/index.js"></script>');
    expect(html).not.toContain('data-codegraphy-view');
    expect(html).toContain('data-codegraphy-theme="light"');
    expect(html).toContain('<div id="root"></div>');
  });

  it('marks the graph debug bridge as enabled when requested', () => {
    const html = createGraphViewHtml(
      vscode.Uri.file('/test/extension'),
      {
        cspSource: 'vscode-webview://test',
        asWebviewUri: vi.fn((uri: vscode.Uri) => `webview:${uri.fsPath}`),
      } as unknown as vscode.Webview,
      'nonce-value',
      'dark',
      true,
    );

    expect(html).toContain('data-codegraphy-debug="true"');
  });

  it('does not enable the graph debug bridge by default', () => {
    const html = createGraphViewHtml(
      vscode.Uri.file('/test/extension'),
      {
        cspSource: 'vscode-webview://test',
        asWebviewUri: vi.fn((uri: vscode.Uri) => `webview:${uri.fsPath}`),
      } as unknown as vscode.Webview,
      'nonce-value',
    );

    expect(html).not.toContain('data-codegraphy-debug');
  });
});
