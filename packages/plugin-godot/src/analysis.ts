import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy/plugin-api';

export type GDScriptFileAnalysisRelation = IAnalysisRelation;

export interface GDScriptFileAnalysisResult {
  filePath: string;
  relations: GDScriptFileAnalysisRelation[];
  symbols?: IAnalysisSymbol[];
}
