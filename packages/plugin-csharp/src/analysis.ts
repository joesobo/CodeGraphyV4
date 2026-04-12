import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';

export type CSharpFileAnalysisRelation = IAnalysisRelation;

export interface CSharpFileAnalysisResult {
  filePath: string;
  relations: CSharpFileAnalysisRelation[];
}
