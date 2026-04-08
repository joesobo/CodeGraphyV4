import type { IConnection } from '@codegraphy-vscode/plugin-api';

export interface GDScriptFileAnalysisRelation {
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

export interface GDScriptFileAnalysisResult {
  filePath: string;
  relations: GDScriptFileAnalysisRelation[];
}

export function buildGDScriptFileAnalysisResult(
  filePath: string,
  connections: IConnection[],
): GDScriptFileAnalysisResult {
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

export function toGDScriptConnections(
  analysis: GDScriptFileAnalysisResult,
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
