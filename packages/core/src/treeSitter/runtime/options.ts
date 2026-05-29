export interface TreeSitterAnalysisOptions {
  includeSymbols?: boolean;
}

export function shouldIncludeTreeSitterSymbols(
  options: TreeSitterAnalysisOptions,
): boolean {
  return options.includeSymbols !== false;
}
