import {
  createSymbolId,
} from '../analyze/results';
import type {
  CppIncludedDeclarations,
  CppOverrideMethod,
} from './relationModel';

export function readCppOverrideSourceSymbolId(
  filePath: string,
  method: CppOverrideMethod,
  symbols: { symbolsEnabled: boolean; typeName: string | undefined },
): string | undefined {
  if (!symbols.symbolsEnabled || !symbols.typeName) {
    return undefined;
  }

  return createSymbolId(
    filePath,
    method.sourceSymbolKind,
    method.sourceSymbolKind === 'method' ? `${symbols.typeName}::${method.methodName}` : symbols.typeName,
  );
}

export function resolveCppOverridePath(
  includedDeclarations: CppIncludedDeclarations,
  inheritedTypePaths: ReadonlyArray<string | null>,
  methodName: string,
): string | null {
  const resolvedPath = includedDeclarations.methodPathByName.get(methodName);
  const inheritedPathSet = new Set(inheritedTypePaths);

  if (resolvedPath && inheritedPathSet.has(resolvedPath)) {
    return resolvedPath;
  }

  return inheritedTypePaths.find((inheritedTypePath): inheritedTypePath is string => Boolean(inheritedTypePath))
    ?? null;
}

export function resolveCppOverrideSymbolId(
  includedDeclarations: CppIncludedDeclarations,
  targetPath: string | null,
  methodName: string,
): string | undefined {
  if (!targetPath) {
    return undefined;
  }

  const symbolId = includedDeclarations.methodSymbolIdByName.get(methodName);
  return symbolId?.startsWith(`${targetPath}:`) ? symbolId : undefined;
}
