import fs from 'fs';
import * as vscode from 'vscode';
import { resolveCssSnippetPath } from './path';

export interface CssSnippetWebviewUriAdapter {
  asWebviewUri(uri: vscode.Uri): unknown;
}

export interface ResolveCssSnippetStylesheetsOptions {
  snippets: Readonly<Record<string, boolean>>;
  warn?: (message: string) => void;
  webview?: CssSnippetWebviewUriAdapter;
  workspaceRoot: string;
}

function stringifyWebviewUri(webviewUri: unknown): string {
  const text = String(webviewUri);
  if (text && text !== '[object Object]') {
    return text;
  }

  const pathLike = webviewUri as { path?: string; fsPath?: string } | null;
  return pathLike?.path ?? pathLike?.fsPath ?? text;
}

export function resolveCssSnippetStylesheets({
  snippets,
  warn = message => console.warn(message),
  webview,
  workspaceRoot,
}: ResolveCssSnippetStylesheetsOptions): string[] {
  const urls: string[] = [];

  for (const [snippet, enabled] of Object.entries(snippets)) {
    if (!enabled) {
      continue;
    }

    const resolved = resolveCssSnippetPath(snippet, workspaceRoot, fs.existsSync);
    if (typeof resolved !== 'string') {
      warn(resolved.warning);
      continue;
    }

    const uri = vscode.Uri.file(resolved);
    urls.push(webview ? stringifyWebviewUri(webview.asWebviewUri(uri)) : uri.fsPath);
  }

  return urls;
}
