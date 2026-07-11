import type * as vscode from 'vscode';

export interface CloseGraphViewFileEditorHandlers {
  closeTabs(tabs: readonly vscode.Tab[], preserveFocus: boolean): Thenable<boolean>;
  getTabUri(tab: vscode.Tab): vscode.Uri | undefined;
  joinPath(base: vscode.Uri, path: string): vscode.Uri;
  tabs: readonly vscode.Tab[];
  workspaceFolder: vscode.Uri;
}

export async function closeGraphViewFileEditor(
  filePath: string,
  handlers: CloseGraphViewFileEditorHandlers,
): Promise<void> {
  const target = handlers.joinPath(handlers.workspaceFolder, filePath).toString();
  const matchingTabs = handlers.tabs.filter(tab => handlers.getTabUri(tab)?.toString() === target);
  if (matchingTabs.length > 0) {
    await handlers.closeTabs(matchingTabs, true);
  }
}
