import type * as vscode from 'vscode';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import type { DagMode, NodeSizeMode } from '../../../../../shared/settings/modes';
import type { GraphViewProviderMethodContainers } from '../../wiring/methodContainers';
import {
  initializeGraphViewProviderRuntimeServices,
  restoreGraphViewProviderRuntimeState,
  type RuntimeBootstrapSource,
} from '../../runtimeBootstrap';

type RuntimeBootstrapDependencies = Pick<
  RuntimeBootstrapSource,
  '_analyzer' | '_context' | '_viewRegistry' | '_eventBus' | '_decorationManager'
>;

export function initializeRuntimeStateServices(
  dependencies: RuntimeBootstrapDependencies,
  getGraphData: () => IGraphData,
  getMethodContainers: () => GraphViewProviderMethodContainers,
): void {
  const source = {
    ...dependencies,
  } as RuntimeBootstrapSource;

  Object.defineProperties(source, {
    _graphData: {
      get: getGraphData,
    },
    getMethodContainers: {
      value: getMethodContainers,
    },
  });

  initializeGraphViewProviderRuntimeServices(source);
}

export function restorePersistedRuntimeState(
  context: vscode.ExtensionContext,
  fallbackNodeSizeMode: NodeSizeMode,
): {
  depthMode: boolean;
  dagMode: DagMode;
  nodeSizeMode: NodeSizeMode;
} {
  return restoreGraphViewProviderRuntimeState(context, fallbackNodeSizeMode);
}

export function getWorkspaceRoot(
  workspaceFolders: typeof vscode.workspace.workspaceFolders,
): string | undefined {
  return workspaceFolders?.[0]?.uri.fsPath;
}
