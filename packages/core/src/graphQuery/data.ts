import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { IGraphData } from '../graph/contracts';

export interface GraphQueryData {
  graphData: IGraphData;
  symbols?: readonly IAnalysisSymbol[];
  relations?: readonly IAnalysisRelation[];
}
