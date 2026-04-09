import * as vscode from 'vscode';
import { coreViews } from '../../../core/views/builtIns';
import { getCodeGraphyConfiguration } from '../../repoSettings/current';
import { initializeGraphViewProviderServices, restoreGraphViewProviderState } from './wiring/bootstrap';
import type { GraphViewProviderMethodContainers } from './wiring/methodContainers';

export const DAG_MODE_KEY = 'dagMode';
export const NODE_SIZE_MODE_KEY = 'nodeSizeMode';
export const DEFAULT_VIEW_ID = 'codegraphy.connections';

type GraphViewProviderServicesArgs = Parameters<typeof initializeGraphViewProviderServices>[0];
type RestoredStateArgs = Parameters<typeof restoreGraphViewProviderState>[0];

export interface RuntimeBootstrapSource {
  _analyzer: unknown;
  _context: vscode.ExtensionContext;
  _viewRegistry: unknown;
  _eventBus: unknown;
  _decorationManager: unknown;
  _graphData: unknown;
  getMethodContainers(): GraphViewProviderMethodContainers;
}

export function initializeGraphViewProviderRuntimeServices(
  source: RuntimeBootstrapSource,
): void {
  initializeGraphViewProviderServices({
    analyzer: source._analyzer as GraphViewProviderServicesArgs['analyzer'],
    viewRegistry: source._viewRegistry as GraphViewProviderServicesArgs['viewRegistry'],
    coreViews,
    eventBus: source._eventBus,
    decorationManager: source._decorationManager as GraphViewProviderServicesArgs['decorationManager'],
    getGraphData: () => source._graphData,
    registerCommand: (id, action) => vscode.commands.registerCommand(id, action),
    pushSubscription: (subscription) => {
      source._context.subscriptions.push(subscription as vscode.Disposable);
    },
    sendMessage: (message) => {
      source.getMethodContainers().webview._sendMessage(message);
    },
    workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '',
    onDecorationsChanged: () => {
      source.getMethodContainers().plugin._sendDecorations();
    },
  });
}

export function restoreGraphViewProviderRuntimeState(
  _context: vscode.ExtensionContext,
  viewRegistry: RuntimeBootstrapSource['_viewRegistry'],
  fallbackNodeSizeMode: RestoredStateArgs['fallbackNodeSizeMode'],
) {
  return restoreGraphViewProviderState({
    configuration: getCodeGraphyConfiguration(),
    viewRegistry: viewRegistry as RestoredStateArgs['viewRegistry'],
    dagModeKey: DAG_MODE_KEY,
    nodeSizeModeKey: NODE_SIZE_MODE_KEY,
    fallbackViewId: DEFAULT_VIEW_ID,
    fallbackNodeSizeMode,
  });
}
