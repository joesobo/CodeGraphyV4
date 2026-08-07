import * as vscode from 'vscode';
import type { GraphViewPrimaryMessageContext } from './primary';
import type { GraphViewLegendMessageState } from '../messages/legends';
import type { GraphViewNodeFileHandlers } from '../nodeFile/router';
import type { GraphViewSettingsMessageState } from '../settingsMessages/router';
import { compareGraphViewFiles } from '../../files/navigation';

export function createGraphViewPrimaryLegendMessageState(
  context: GraphViewPrimaryMessageContext,
): GraphViewLegendMessageState {
  return {
    userLegends: context.getUserGroups(),
  };
}

export function createGraphViewPrimaryNodeFileHandlers(
  context: GraphViewPrimaryMessageContext,
): GraphViewNodeFileHandlers {
  return {
    ...context,
    compareFiles: paths => compareGraphViewFiles(paths, {
      workspaceFolder: context.workspaceFolder,
      executeCommand: (command, ...args) => vscode.commands.executeCommand(command, ...args),
    }),
    indexGraph: async () => {
      context.cancelScheduledPluginGraphWork?.();
      await context.indexAndSendData();
    },
    refreshGraph: async () => {
      context.cancelScheduledPluginGraphWork?.();
      await context.refreshIndex();
    },
  };
}

export function createGraphViewPrimarySettingsMessageState(
  context: GraphViewPrimaryMessageContext,
): GraphViewSettingsMessageState {
  const asWebviewUri = context.asWebviewUri
    ? (uri: Parameters<NonNullable<typeof context.asWebviewUri>>[0]) => context.asWebviewUri?.(uri) ?? uri
    : undefined;

  return {
    filterPatterns: context.getFilterPatterns(),
    workspaceRoot: context.workspaceFolder?.uri.fsPath,
    asWebviewUri,
  };
}
