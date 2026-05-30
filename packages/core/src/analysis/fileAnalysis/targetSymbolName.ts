import type {
  IAnalysisRelationshipEvidence,
  IAnalysisSymbol,
} from '@codegraphy-dev/plugin-api';

export function resolveTargetSymbolId(
  relation: IAnalysisRelationshipEvidence,
  targetSymbols: readonly IAnalysisSymbol[],
): string | undefined {
  const symbolName = readRelationSymbolName(relation);
  const namedSymbolId = symbolName
    ? resolveUniqueSymbolName(targetSymbols, symbolName)
    : undefined;

  return namedSymbolId ?? resolveUniqueTargetSymbol(targetSymbols);
}

function readRelationSymbolName(
  relation: IAnalysisRelationshipEvidence,
): string | undefined {
  const memberName = readRelationMetadataString(relation, 'memberName');
  const importedName = readRelationMetadataString(relation, 'importedName');

  return memberName ?? readNamedImport(importedName);
}

function readNamedImport(importedName: string | undefined): string | undefined {
  return importedName && importedName !== '*' && importedName !== 'default'
    ? importedName
    : undefined;
}

function resolveUniqueSymbolName(
  targetSymbols: readonly IAnalysisSymbol[],
  symbolName: string,
): string | undefined {
  const matches = targetSymbols.filter((symbol) => symbol.name === symbolName);
  return matches.length === 1 ? matches[0].id : undefined;
}

function resolveUniqueTargetSymbol(
  targetSymbols: readonly IAnalysisSymbol[],
): string | undefined {
  return targetSymbols.length === 1 ? targetSymbols[0].id : undefined;
}

function readRelationMetadataString(
  relation: IAnalysisRelationshipEvidence,
  key: string,
): string | undefined {
  const value = relation.metadata?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
