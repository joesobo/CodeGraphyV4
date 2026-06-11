import fs from 'fs';
import path from 'path';
import * as vscode from 'vscode';

export interface ResolveCssSnippetStylesheetsOptions {
  snippets: readonly string[];
  warn?: (message: string) => void;
  webview?: Pick<vscode.Webview, 'asWebviewUri'>;
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

function isParentTraversal(snippetPath: string): boolean {
  return snippetPath
    .split(/[\\/]+/)
    .some(segment => segment === '..');
}

function isCssFile(snippetPath: string): boolean {
  return path.extname(snippetPath).toLowerCase() === '.css';
}

export function resolveCssSnippetStylesheets({
  snippets,
  warn = message => console.warn(message),
  webview,
  workspaceRoot,
}: ResolveCssSnippetStylesheetsOptions): string[] {
  const urls: string[] = [];

  for (const snippet of snippets) {
    if (path.isAbsolute(snippet)) {
      warn(`[CodeGraphy] CSS snippet ignored because absolute paths are not supported: ${snippet}`);
      continue;
    }

    if (isParentTraversal(snippet)) {
      warn(`[CodeGraphy] CSS snippet ignored because parent traversal is not supported: ${snippet}`);
      continue;
    }

    if (!isCssFile(snippet)) {
      warn(`[CodeGraphy] CSS snippet ignored because it is not a CSS file: ${snippet}`);
      continue;
    }

    const filePath = path.resolve(workspaceRoot, snippet);
    if (!fs.existsSync(filePath)) {
      warn(`[CodeGraphy] CSS snippet not found: ${snippet}`);
      continue;
    }

    const uri = vscode.Uri.file(filePath);
    urls.push(webview ? stringifyWebviewUri(webview.asWebviewUri(uri) as unknown) : uri.fsPath);
  }

  return urls;
}
