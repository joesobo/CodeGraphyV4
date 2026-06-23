import * as vscode from 'vscode';
import type { DiagnosticEventInput } from '@codegraphy-dev/core';
import type { IGraphData } from '../../../../../shared/graph/contracts';
import {
  executeGraphViewProviderAnalysis,
  isGraphViewAbortError,
  isGraphViewAnalysisStale,
  markGraphViewWorkspaceReady,
  runGraphViewProviderAnalysisRequest,
  type GraphViewProviderAnalysisHandlers,
  type GraphViewProviderAnalysisRequestHandlers,
  type GraphViewProviderAnalysisState,
} from '../../../analysis/lifecycle';
import { createExtensionDiagnosticLogger } from '../../../../diagnostics/logger';
import { getCodeGraphyConfiguration } from '../../../../repoSettings/current';
import type { GraphViewProviderWorkspaceReadyRegistryLike } from '../methods';

export interface GraphViewProviderAnalysisMethodDependencies {
  runAnalysisRequest: (
    state: GraphViewProviderAnalysisState,
    handlers: GraphViewProviderAnalysisRequestHandlers,
  ) => Promise<void>;
  executeAnalysis: (
    signal: AbortSignal,
    requestId: number,
    state: GraphViewProviderAnalysisState,
    handlers: GraphViewProviderAnalysisHandlers,
  ) => Promise<void>;
  markWorkspaceReady: (
    state: {
      firstAnalysis: boolean;
      resolveFirstWorkspaceReady: (() => void) | undefined;
    },
    registry: GraphViewProviderWorkspaceReadyRegistryLike | undefined,
    graphData: IGraphData,
    disabledPlugins?: ReadonlySet<string>,
  ) => void;
  isAnalysisStale: (
    signal: AbortSignal,
    requestId: number,
    currentRequestId: number,
  ) => boolean;
  isAbortError(error: unknown): boolean;
  hasWorkspace(): boolean;
  logError(message: string, error: unknown): void;
  emitDiagnostic?(input: DiagnosticEventInput): void;
}

export function createDefaultGraphViewProviderAnalysisMethodDependencies(): GraphViewProviderAnalysisMethodDependencies {
  const diagnostics = createExtensionDiagnosticLogger({
    isEnabled: () => getCodeGraphyConfiguration().get('verboseDiagnostics', false),
  });

  return {
    runAnalysisRequest: runGraphViewProviderAnalysisRequest,
    executeAnalysis: executeGraphViewProviderAnalysis,
    markWorkspaceReady: markGraphViewWorkspaceReady,
    isAnalysisStale: isGraphViewAnalysisStale,
    isAbortError: isGraphViewAbortError,
    hasWorkspace: () => (vscode.workspace.workspaceFolders?.length ?? 0) > 0,
    logError: (message, error) => {
      console.error(message, error);
    },
    emitDiagnostic: input => diagnostics.emit(input),
  };
}
