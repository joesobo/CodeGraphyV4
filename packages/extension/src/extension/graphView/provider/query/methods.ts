import type { GraphQueryRequest, GraphQueryResult } from '@codegraphy/core';
import { executeGraphQuery } from '@codegraphy/core';
import type { IAnalysisRelation, IAnalysisSymbol } from '../../../../core/plugins/types/contracts';
import type { IGraphData } from '../../../../shared/graph/contracts';

interface GraphViewProviderQueryAnalyzerLike {
  readStructuredAnalysisSnapshot(): {
    symbols: IAnalysisSymbol[];
    relations: IAnalysisRelation[];
  };
}

export interface GraphViewProviderQueryMethodsSource {
  _rawGraphData: IGraphData;
  _analyzer?: GraphViewProviderQueryAnalyzerLike;
}

export interface GraphViewProviderQueryMethods {
  queryGraph(request: GraphQueryRequest): GraphQueryResult;
}

export function createGraphViewProviderQueryMethods(
  source: GraphViewProviderQueryMethodsSource,
): GraphViewProviderQueryMethods {
  const queryGraph = (request: GraphQueryRequest): GraphQueryResult => {
    const snapshot = source._analyzer?.readStructuredAnalysisSnapshot();

    return executeGraphQuery({
      graphData: source._rawGraphData,
      symbols: snapshot?.symbols ?? [],
      relations: snapshot?.relations ?? [],
    }, request);
  };

  return { queryGraph };
}
