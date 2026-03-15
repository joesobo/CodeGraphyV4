import type { IGraphData } from '../../shared/types';
import type { GraphViewProviderAnalysisMethodsSource } from './providerAnalysisMethods';

interface GraphViewProviderAnalysisDelegateMethods {
  markWorkspaceReady(graph: IGraphData): void;
  isAnalysisStale(signal: AbortSignal, requestId: number): boolean;
  isAbortError(error: unknown): boolean;
}

export interface GraphViewProviderAnalysisDelegateCalls {
  callMarkWorkspaceReady(graph: IGraphData): void;
  callIsAnalysisStale(signal: AbortSignal, requestId: number): boolean;
  callIsAbortError(error: unknown): boolean;
}

export function createGraphViewProviderAnalysisDelegates(
  source: GraphViewProviderAnalysisMethodsSource,
  methods: GraphViewProviderAnalysisDelegateMethods,
): GraphViewProviderAnalysisDelegateCalls {
  const callMarkWorkspaceReady = (graph: IGraphData): void => {
    const implementation = source._markWorkspaceReady;
    if (implementation && implementation !== methods.markWorkspaceReady) {
      implementation(graph);
      return;
    }

    methods.markWorkspaceReady(graph);
  };

  const callIsAnalysisStale = (signal: AbortSignal, requestId: number): boolean => {
    const implementation = source._isAnalysisStale;
    if (implementation && implementation !== methods.isAnalysisStale) {
      return implementation(signal, requestId);
    }

    return methods.isAnalysisStale(signal, requestId);
  };

  const callIsAbortError = (error: unknown): boolean => {
    const implementation = source._isAbortError;
    if (implementation && implementation !== methods.isAbortError) {
      return implementation(error);
    }

    return methods.isAbortError(error);
  };

  return {
    callMarkWorkspaceReady,
    callIsAnalysisStale,
    callIsAbortError,
  };
}
