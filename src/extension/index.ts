import * as vscode from 'vscode';
import { GraphViewProvider } from './GraphViewProvider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new GraphViewProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GraphViewProvider.viewType,
      provider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.open', () => {
      vscode.commands.executeCommand('workbench.view.extension.codegraphy');
    })
  );
}

export function deactivate(): void {
  // Cleanup if needed
}
