import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { RelationRow } from '../records/contracts';
import {
  parseOptionalJson,
  readOptionalString,
  readRequiredString,
} from '../records/values';

export function createSnapshotRelationEntry(row: RelationRow): IAnalysisRelation | undefined {
  const filePath = readRequiredString(row.filePath);
  const kind = readRequiredString(row.kind);
  const sourceId = readRequiredString(row.sourceId);
  const fromFilePath = readRequiredString(row.fromFilePath);

  if (!filePath || !kind || !sourceId || !fromFilePath) {
    return undefined;
  }

  const optional = {
    pluginId: readOptionalString(row.pluginId),
    toFilePath: readOptionalString(row.toFilePath),
    fromNodeId: readOptionalString(row.fromNodeId),
    toNodeId: readOptionalString(row.toNodeId),
    fromSymbolId: readOptionalString(row.fromSymbolId),
    toSymbolId: readOptionalString(row.toSymbolId),
    specifier: readOptionalString(row.specifier),
    type: readOptionalString(row.relationType),
    variant: readOptionalString(row.variant),
    resolvedPath: readOptionalString(row.resolvedPath),
    metadata: parseOptionalJson(row.metadataJson),
  };
  return {
    kind: kind as IAnalysisRelation['kind'],
    sourceId,
    fromFilePath,
    ...Object.fromEntries(Object.entries(optional).filter(([, value]) => value !== undefined)),
  };
}
