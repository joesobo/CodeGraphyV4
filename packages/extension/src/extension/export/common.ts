import * as vscode from 'vscode';

interface SaveExportBufferOptions {
  defaultFilename: string;
  filters: Record<string, string[]>;
  title: string;
  successMessage: string;
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function decodeBase64DataUrl(dataUrl: string, expectedPrefix: string): Buffer {
  if (!dataUrl.startsWith(expectedPrefix)) {
    throw new Error(`Unexpected export data format. Expected prefix: ${expectedPrefix}`);
  }

  const base64Data = dataUrl.slice(expectedPrefix.length);
  return Buffer.from(base64Data, 'base64');
}

export async function saveExportBuffer(buffer: Uint8Array, options: SaveExportBufferOptions): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
  const defaultUri = workspaceFolder
    ? vscode.Uri.joinPath(workspaceFolder, options.defaultFilename)
    : vscode.Uri.file(options.defaultFilename);

  const saveUri = await vscode.window.showSaveDialog({
    defaultUri,
    filters: options.filters,
    saveLabel: 'Export',
    title: options.title,
  });

  if (!saveUri) {
    return;
  }

  await vscode.workspace.fs.writeFile(saveUri, buffer);

  const action = await vscode.window.showInformationMessage(
    `${options.successMessage} to ${saveUri.fsPath}`,
    'Open File',
    'Open Folder'
  );

  if (action === 'Open File') {
    await vscode.commands.executeCommand('vscode.open', saveUri);
  } else if (action === 'Open Folder') {
    await vscode.commands.executeCommand('revealFileInOS', saveUri);
  }
}
