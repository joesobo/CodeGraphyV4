import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-vscode/plugin-api';

export type GDScriptFileAnalysisRelation = IAnalysisRelation;

export interface GDScriptFileAnalysisResult {
  filePath: string;
  relations: GDScriptFileAnalysisRelation[];
  symbols?: IAnalysisSymbol[];
}
