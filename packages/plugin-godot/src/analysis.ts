import type { IAnalysisRelationshipEvidence, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';

export type GDScriptFileAnalysisRelation = IAnalysisRelationshipEvidence;

export interface GDScriptFileAnalysisResult {
  filePath: string;
  relations: GDScriptFileAnalysisRelation[];
  symbols?: IAnalysisSymbol[];
}
