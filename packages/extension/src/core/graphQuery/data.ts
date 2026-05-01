import type { IAnalysisRelation, IAnalysisSymbol } from '../plugins/types/contracts';
import type { IGraphData } from '../../shared/graph/contracts';

export interface GraphQueryData {
  graphData: IGraphData;
  symbols?: readonly IAnalysisSymbol[];
  relations?: readonly IAnalysisRelation[];
}
