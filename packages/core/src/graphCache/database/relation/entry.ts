import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';
import type { RelationRow } from '../records/contracts';
import {
  parseOptionalJson,
  readOptionalString,
  readRequiredString,
} from '../records/values';

export function createSnapshotRelationEntry(row: RelationRow): IAnalysisRelationshipEvidence | undefined {
  const filePath = readRequiredString(row.filePath);
  const kind = readRequiredString(row.kind);
  const sourceId = readRequiredString(row.sourceId);
  const fromFilePath = readRequiredString(row.fromFilePath);

  if (!filePath || !kind || !sourceId || !fromFilePath) {
    return undefined;
  }

  return {
    edgeType: kind as IAnalysisRelationshipEvidence['edgeType'],
    pluginId: readOptionalString(row.pluginId),
    sourceId,
    from: readOptionalString(row.fromSymbolId)
      ? { kind: 'symbol', symbolId: readOptionalString(row.fromSymbolId)!, filePath: fromFilePath }
      : readOptionalString(row.fromNodeId)
        ? { kind: 'node', nodeId: readOptionalString(row.fromNodeId)! }
        : { kind: 'file', filePath: fromFilePath },
    target: readOptionalString(row.toSymbolId)
      ? { kind: 'symbol', symbolId: readOptionalString(row.toSymbolId)!, filePath: readOptionalString(row.toFilePath) ?? undefined, specifier: readOptionalString(row.specifier) }
      : readOptionalString(row.toNodeId)
        ? { kind: 'node', nodeId: readOptionalString(row.toNodeId)!, specifier: readOptionalString(row.specifier) }
        : readOptionalString(row.toFilePath)
          ? { kind: 'file', path: readOptionalString(row.toFilePath)!, pathKind: 'absolute', specifier: readOptionalString(row.specifier) }
          : { kind: 'unresolved', specifier: readOptionalString(row.specifier) ?? '' },
    specifier: readOptionalString(row.specifier),
    timing: readOptionalString(row.relationType),
    variant: readOptionalString(row.variant),
    metadata: parseOptionalJson(row.metadataJson),
  };
}
