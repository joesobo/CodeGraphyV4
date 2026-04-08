import type { IConnection } from '@codegraphy-vscode/plugin-api';

export interface CSharpFileAnalysisRelation {
  kind: IConnection['kind'];
  sourceId: string;
  specifier: string;
  type: IConnection['type'];
  variant?: IConnection['variant'];
  resolvedPath: string | null;
  metadata?: IConnection['metadata'];
  fromFilePath: string;
  toFilePath: string | null;
}

export interface CSharpFileAnalysisResult {
  filePath: string;
  relations: CSharpFileAnalysisRelation[];
}

export function buildCSharpFileAnalysisResult(
  filePath: string,
  connections: IConnection[],
): CSharpFileAnalysisResult {
  return {
    filePath,
    relations: connections.map((connection) => ({
      kind: connection.kind,
      sourceId: connection.sourceId,
      specifier: connection.specifier,
      type: connection.type,
      variant: connection.variant,
      resolvedPath: connection.resolvedPath,
      metadata: connection.metadata,
      fromFilePath: filePath,
      toFilePath: connection.resolvedPath,
    })),
  };
}

export function toCSharpConnections(
  analysis: CSharpFileAnalysisResult,
): IConnection[] {
  return analysis.relations.map((relation) => ({
    kind: relation.kind,
    sourceId: relation.sourceId,
    specifier: relation.specifier,
    type: relation.type,
    variant: relation.variant,
    resolvedPath: relation.resolvedPath,
    metadata: relation.metadata,
  }));
}
