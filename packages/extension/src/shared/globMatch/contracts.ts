export type GlobMatcher = (filePath: string) => boolean;

export interface CombinedFastGlobMatchers {
  directMatchers: GlobMatcher[];
  literalSuffixes: string[];
  recursiveDirectoryNames: Set<string>;
  suffixes: string[];
}

export type FastGlobPattern =
  | { kind: 'directChild'; directoryPath: string }
  | { kind: 'literal'; suffix: string }
  | { kind: 'recursiveDirectory'; directoryPath: string }
  | { kind: 'suffix'; suffix: string };
