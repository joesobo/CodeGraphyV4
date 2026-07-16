export interface HaskellImportList {
  callableNames: Set<string>;
  constructorNames: Set<string>;
  typeNames: Set<string>;
  typesWithConstructors: Set<string>;
}

export interface HaskellModuleNames {
  callableNames: Set<string>;
  constructorNamesByType: Map<string, Set<string>>;
  typeNames: Set<string>;
}
