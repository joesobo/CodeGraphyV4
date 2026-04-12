import * as vscode from 'vscode';
import type { GraphViewProvider } from '../graphViewProvider';
import { onDidChangeCodeGraphyConfiguration } from '../repoSettings/current';
import { classifyConfigChange } from './classify';
import { executeConfigAction } from './actions';

/**
 * Registers a configuration-change listener and routes each setting category
 * to the appropriate provider refresh method.
 */
export function registerConfigHandler(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider
): void {
  context.subscriptions.push(
    onDidChangeCodeGraphyConfiguration((event) => {
      const category = classifyConfigChange(event);
      if (category !== null) {
        executeConfigAction(category, event, provider);
      }
    })
  );
}
