import * as vscode from 'vscode';
import type { GraphViewProvider } from './graphViewProvider';

/** Registers all codegraphy VS Code commands. */
export function registerCommands(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.open', () => {
      vscode.commands.executeCommand('workbench.view.extension.codegraphy');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.openInEditor', () => {
      provider.openInEditor();
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
    vscode.commands.registerCommand('codegraphy.exportSvg', () => {
      provider.requestExportSvg();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.exportJpeg', () => {
      provider.requestExportJpeg();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.exportJson', () => {
      provider.requestExportJson();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.exportMarkdown', () => {
      provider.requestExportMarkdown();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.clearCache', () => {
      void provider.clearCacheAndRefresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.cycleView', () => {
      provider.sendCommand('CYCLE_VIEW');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.cycleLayout', () => {
      provider.sendCommand('CYCLE_LAYOUT');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('codegraphy.toggleDimension', () => {
      provider.sendCommand('TOGGLE_DIMENSION');
    })
  );
}
