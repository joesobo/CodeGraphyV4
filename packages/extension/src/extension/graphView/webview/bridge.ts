import type * as vscode from 'vscode';

export function sendGraphViewWebviewMessage(
  view: vscode.WebviewView | undefined,
  panels: readonly vscode.WebviewPanel[],
  message: unknown,
): void {
  if (view) {
    void view.webview.postMessage(message);
  }

  for (const panel of panels) {
    void panel.webview.postMessage(message);
  }
}

export function onGraphViewWebviewMessage(
  view: vscode.WebviewView | undefined,
  handler: (message: unknown) => void,
): vscode.Disposable {
  if (!view) {
    return { dispose: () => {} };
  }

  return view.webview.onDidReceiveMessage(handler);
}
