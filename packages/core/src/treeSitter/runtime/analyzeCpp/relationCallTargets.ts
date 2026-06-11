import type {
  CppIncludedDeclarations,
  CppResolvedDeclaration,
} from './relationModel';

export function resolveCppCallTarget(
  includedDeclarations: CppIncludedDeclarations,
  calleeName: string,
): CppResolvedDeclaration | null {
  return resolveCppDeclarationTarget(
    includedDeclarations.functionPathByName,
    includedDeclarations.functionSymbolIdByName,
    calleeName,
  )
    ?? resolveCppDeclarationTarget(
      includedDeclarations.methodCallPathByName,
      includedDeclarations.methodSymbolIdByName,
      calleeName,
    )
    ?? resolveCppTypeCallTarget(includedDeclarations, calleeName);
}

function resolveCppDeclarationTarget(
  pathByName: ReadonlyMap<string, string | null>,
  symbolIdByName: ReadonlyMap<string, string>,
  name: string,
): CppResolvedDeclaration | null {
  const filePath = pathByName.get(name);
  if (!filePath) {
    return null;
  }

  const symbolId = symbolIdByName.get(name);
  return {
    filePath,
    ...(symbolId?.startsWith(`${filePath}:`) ? { symbolId } : {}),
  };
}

function resolveCppTypeCallTarget(
  includedDeclarations: CppIncludedDeclarations,
  calleeName: string,
): CppResolvedDeclaration | null {
  const typePath = includedDeclarations.typePathByName.get(calleeName);
  return typePath ? { filePath: typePath } : null;
}
