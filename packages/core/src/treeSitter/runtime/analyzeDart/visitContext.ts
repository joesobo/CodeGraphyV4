import type { IAnalysisRelation, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';

export interface DartVisitContext {
  filePath: string;
  workspaceRoot: string;
  relations: IAnalysisRelation[];
  symbols: IAnalysisSymbol[];
  importedSymbolPaths: Map<string, string | null>;
  importedSymbolKinds: Map<string, string>;
  localValueReturningMethods: Set<string>;
  pendingSymbolContext: { value: { id?: string; kind: string } | undefined };
  symbolsEnabled: boolean;
}
