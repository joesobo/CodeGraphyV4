import * as vscode from 'vscode';
import type { GraphViewProvider } from './graphViewProvider';
import { classifyConfigChange } from './configChangeDetection';
import { executeConfigAction } from './configActions';

/**
 * Registers a configuration-change listener and routes each setting category
 * to the appropriate provider refresh method.
 */
export function registerConfigHandler(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider
): void {
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      const category = classifyConfigChange(event);
      if (category !== null) {
        executeConfigAction(category, event, provider);
      }
    })
  );
}
