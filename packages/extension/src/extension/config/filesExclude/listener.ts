import * as vscode from 'vscode';

interface FilesExcludeConfigProvider {
  clearCacheAndRefresh(): Promise<void>;
  invalidateTimelineCache(): Promise<void>;
}

function isFilesExcludeChange(event: vscode.ConfigurationChangeEvent): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) {
    return event.affectsConfiguration('files.exclude');
  }
  return workspaceFolders.some(folder =>
    event.affectsConfiguration('files.exclude', folder.uri)
  );
}

export function registerFilesExcludeConfigHandler(
  context: vscode.ExtensionContext,
  provider: FilesExcludeConfigProvider,
): void {
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((event) => {
    if (!isFilesExcludeChange(event)) return;
    void provider.clearCacheAndRefresh();
    void provider.invalidateTimelineCache();
  }));
}
