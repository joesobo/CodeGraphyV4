import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-vscode/plugin-api';

export interface DatabaseFileRecord {
  filePath: string;
  mtime: number;
  size?: number;
}

export interface DatabaseSnapshot {
  files: DatabaseFileRecord[];
  symbols: IAnalysisSymbol[];
  relations: IAnalysisRelation[];
}
