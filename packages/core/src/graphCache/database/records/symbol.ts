import type {
  GraphMetadata,
  IAnalysisRange,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';
import type { SymbolRow } from './contracts';
import {
  parseOptionalJson,
  readOptionalString,
  readRequiredString,
} from './values';

export function createSnapshotSymbolEntry(row: SymbolRow): IAnalysisSymbol | undefined {
  const symbolId = readRequiredString(row.symbolId);
  const filePath = readRequiredString(row.filePath);
  const name = readRequiredString(row.name);
  const kind = readRequiredString(row.kind);

  if (!symbolId || !filePath || !name || !kind) {
    return undefined;
  }

  const signature = readOptionalString(row.signature);
  const range = parseOptionalJson<IAnalysisRange>(row.rangeJson);
  const metadata = parseOptionalJson<GraphMetadata>(row.metadataJson);
  return {
    id: symbolId,
    filePath,
    name,
    kind,
    ...(signature === undefined ? {} : { signature }),
    ...(range === undefined ? {} : { range }),
    ...(metadata === undefined ? {} : { metadata }),
  };
}
