import * as vscode from 'vscode';
import * as path from 'path';
import { GraphViewProvider } from './GraphViewProvider';
import { Configuration } from './Configuration';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new GraphViewProvider(context.extensionUri, context);
  const config = new Configuration();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GraphViewProvider.viewType,
      provider
    )
  );

  // Listen for configuration changes and refresh graph
  context.subscriptions.push(
    config.onDidChange(() => {
      console.log('[CodeGraphy] Configuration changed, refreshing graph');
      provider.refresh();
    })
  );

  // Track file visits when active editor changes (for access-count mode)
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.uri.scheme === 'file') {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
          const relativePath = path.relative(
            workspaceFolder.uri.fsPath,
            editor.document.uri.fsPath
          );
          // Only track files within the workspace (not external files)
          if (!relativePath.startsWith('..')) {
            // Normalize to forward slashes for consistency
            const normalizedPath = relativePath.replace(/\\/g, '/');
            await provider.trackFileVisit(normalizedPath);
          }
        }
      }
    })
  );

  // Refresh graph when files are saved (for connections and file-size modes)
  // Debounce to avoid excessive refreshes during rapid saves
  let saveTimeout: NodeJS.Timeout | undefined;
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(() => {
        console.log('[CodeGraphy] File saved, refreshing graph');
        provider.refresh();
      }, 500);
    })
  );

  // Refresh graph when files are created or deleted
  const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*');
  context.subscriptions.push(
    fileWatcher.onDidCreate(() => {
      console.log('[CodeGraphy] File created, refreshing graph');
      provider.refresh();
    })
  );
  context.subscriptions.push(
    fileWatcher.onDidDelete(() => {
      console.log('[CodeGraphy] File deleted, refreshing graph');
      provider.refresh();
    })
  );
  context.subscriptions.push(fileWatcher);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.open', () => {
      vscode.commands.executeCommand('workbench.view.extension.codegraphy');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.fitView', () => {
      provider.sendCommand('FIT_VIEW');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.zoomIn', () => {
      provider.sendCommand('ZOOM_IN');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.zoomOut', () => {
      provider.sendCommand('ZOOM_OUT');
    })
  );

  // Undo/Redo commands
  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.undo', async () => {
      const description = await provider.undo();
      if (description) {
        vscode.window.showInformationMessage(`Undo: ${description}`);
      } else {
        vscode.window.showInformationMessage('Nothing to undo');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.redo', async () => {
      const description = await provider.redo();
      if (description) {
        vscode.window.showInformationMessage(`Redo: ${description}`);
      } else {
        vscode.window.showInformationMessage('Nothing to redo');
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.exportPng', () => {
      provider.requestExportPng();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.clearCache', () => {
      provider.clearCacheAndRefresh();
    })
  );
}

export function deactivate(): void {
  // Cleanup if needed
}
