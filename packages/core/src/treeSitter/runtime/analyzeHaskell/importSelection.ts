import type { HaskellImportList, HaskellModuleNames } from './importModel';

export function filterImportedHaskellCallableNames(
  importedNames: HaskellModuleNames,
  importList: HaskellImportList | undefined,
): string[] {
  if (!importList) return [...importedNames.callableNames];
  const names = new Set<string>();
  addAvailableNames(names, importList.callableNames, importedNames.callableNames);
  addAvailableNames(names, importList.constructorNames, importedNames.callableNames);
  for (const typeName of importList.typesWithConstructors) {
    for (const constructorName of importedNames.constructorNamesByType.get(typeName) ?? []) names.add(constructorName);
  }
  return [...names];
}

function addAvailableNames(target: Set<string>, selected: ReadonlySet<string>, available: ReadonlySet<string>): void {
  for (const name of selected) {
    if (available.has(name)) target.add(name);
  }
}

export function filterImportedHaskellTypeNames(
  importedNames: HaskellModuleNames,
  importList: HaskellImportList | undefined,
): string[] {
  return importList
    ? [...importList.typeNames].filter(typeName => importedNames.typeNames.has(typeName))
    : [...importedNames.typeNames];
}
