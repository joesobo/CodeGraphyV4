import * as vscode from 'vscode';
import type { GraphViewProvider } from './graphViewProvider';
import { getCommandDefinitions } from './commandHandlers';

/** Registers all codegraphy VS Code commands. */
export function registerCommands(
  context: vscode.ExtensionContext,
  provider: GraphViewProvider
): void {
  for (const { id, handler } of getCommandDefinitions(provider)) {
    context.subscriptions.push(
      vscode.commands.registerCommand(id, handler)
    );
  }
}
