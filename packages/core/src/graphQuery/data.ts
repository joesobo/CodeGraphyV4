import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { IGraphData } from '../graph/contracts';

export interface GraphQuerySourceText {
  files: readonly { filePath: string; content: string }[];
  filesScanned: number;
  filesSkipped: number;
  hasChangedFiles?: boolean;
}

export interface GraphQueryData {
  graphData: IGraphData;
  symbols?: readonly IAnalysisSymbol[];
  relations?: readonly IAnalysisRelation[];
  sourceText?: GraphQuerySourceText;
  cacheState?: 'fresh' | 'stale';
}
