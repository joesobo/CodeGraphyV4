import type { IAnalysisSymbol } from '../../../core/plugins/types/contracts';
import type { SymbolRow } from './cacheRows';
import {
  parseOptionalJson,
  readOptionalString,
  readRequiredString,
} from './cacheRowValues';

export function createSnapshotSymbolEntry(row: SymbolRow): IAnalysisSymbol | undefined {
  const symbolId = readRequiredString(row.symbolId);
  const filePath = readRequiredString(row.filePath);
  const name = readRequiredString(row.name);
  const kind = readRequiredString(row.kind);

  if (!symbolId || !filePath || !name || !kind) {
    return undefined;
  }

  return {
    id: symbolId,
    filePath,
    name,
    kind,
    signature: readOptionalString(row.signature),
    range: parseOptionalJson(row.rangeJson),
    metadata: parseOptionalJson(row.metadataJson),
  };
}
