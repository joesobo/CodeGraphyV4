import * as vscode from 'vscode';
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
