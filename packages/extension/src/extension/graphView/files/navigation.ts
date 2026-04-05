import * as vscode from 'vscode';

export type GraphViewEditorOpenBehavior = Pick<
  vscode.TextDocumentShowOptions,
  'preview' | 'preserveFocus'
>;

interface GraphViewWorkspaceFolderRef {
  uri: vscode.Uri;
}

export interface GraphViewFileNavigationHandlers {
  workspaceFolder?: GraphViewWorkspaceFolderRef;
  showInformationMessage(message: string): void;
  showErrorMessage(message: string): void;
  statFile(fileUri: vscode.Uri): PromiseLike<unknown>;
  openTextDocument(fileUri: vscode.Uri): PromiseLike<vscode.TextDocument>;
  showTextDocument(
    document: vscode.TextDocument,
    behavior: GraphViewEditorOpenBehavior,
  ): PromiseLike<unknown>;
  incrementVisitCount(filePath: string): Promise<void>;
  didOpenFile?(filePath: string): PromiseLike<void> | void;
  logError(label: string, error: unknown): void;
}

export interface GraphViewClipboardHandlers {
  workspaceFolder?: GraphViewWorkspaceFolderRef;
  writeText(text: string): PromiseLike<void>;
}

export interface GraphViewExplorerHandlers {
  workspaceFolder?: GraphViewWorkspaceFolderRef;
  executeCommand(command: string, ...args: unknown[]): PromiseLike<unknown>;
}

export async function openGraphViewFile(
  filePath: string,
  handlers: GraphViewFileNavigationHandlers,
  behavior: GraphViewEditorOpenBehavior = { preview: false, preserveFocus: false },
): Promise<void> {
  try {
    if (!handlers.workspaceFolder) {
      handlers.showInformationMessage(`Mock file: ${filePath}`);
      return;
    }

    const fileUri = vscode.Uri.joinPath(handlers.workspaceFolder.uri, filePath);

    try {
      await handlers.statFile(fileUri);
    } catch {
      handlers.showInformationMessage(`Mock file: ${filePath}`);
      return;
    }

    const document = await handlers.openTextDocument(fileUri);
    await handlers.showTextDocument(document, behavior);
    await handlers.incrementVisitCount(filePath);
    await handlers.didOpenFile?.(filePath);
  } catch (error) {
    handlers.logError('[CodeGraphy] Failed to open file:', error);
    handlers.showErrorMessage(`Could not open file: ${filePath}`);
  }
}

export async function revealGraphViewFileInExplorer(
  filePath: string,
  handlers: GraphViewExplorerHandlers,
): Promise<void> {
  if (!handlers.workspaceFolder) return;

  const fileUri = vscode.Uri.joinPath(handlers.workspaceFolder.uri, filePath);
  await handlers.executeCommand('revealInExplorer', fileUri);
}

export async function copyGraphViewTextToClipboard(
  text: string,
  handlers: GraphViewClipboardHandlers,
): Promise<void> {
  if (text.startsWith('absolute:') && handlers.workspaceFolder) {
    const relativePath = text.slice('absolute:'.length);
    const absolutePath = vscode.Uri.joinPath(handlers.workspaceFolder.uri, relativePath).fsPath;
    await handlers.writeText(absolutePath);
    return;
  }

  await handlers.writeText(text);
}
