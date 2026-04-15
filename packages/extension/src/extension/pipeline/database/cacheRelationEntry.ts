import type { IAnalysisRelation } from '../../../core/plugins/types/contracts';
import type { RelationRow } from './cacheRows';
import {
  parseOptionalJson,
  readOptionalString,
  readRequiredString,
} from './cacheRowValues';

export function createSnapshotRelationEntry(row: RelationRow): IAnalysisRelation | undefined {
  const filePath = readRequiredString(row.filePath);
  const kind = readRequiredString(row.kind);
  const sourceId = readRequiredString(row.sourceId);
  const fromFilePath = readRequiredString(row.fromFilePath);

  if (!filePath || !kind || !sourceId || !fromFilePath) {
    return undefined;
  }

  return {
    kind: kind as IAnalysisRelation['kind'],
    pluginId: readOptionalString(row.pluginId),
    sourceId,
    fromFilePath,
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
}
