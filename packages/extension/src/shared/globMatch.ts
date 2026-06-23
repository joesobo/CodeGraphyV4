/**
 * Convert a simple glob pattern to a RegExp.
 *
 * Rules:
 *  - `**` matches any path segments, including nested `/`
 *  - `*` matches anything except `/`
 *  - regex metacharacters are escaped
 *
 * Patterns are matched against the basename or path suffix, so `src/*`
 * works anywhere in the tree while still keeping `*` and `**` semantics.
 */
export function globToRegex(pattern: string): RegExp {
  let body = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    const nextCharacter = pattern[index + 1];
    const afterNextCharacter = pattern[index + 2];

    if (character === '*' && nextCharacter === '*' && afterNextCharacter === '/') {
      body += '(?:.*/)?';
      index += 2;
      continue;
    }

    if (character === '*' && nextCharacter === '*') {
      body += '.*';
      index += 1;
      continue;
    }

    if (character === '*') {
      body += '[^/]*';
      continue;
    }

    body += character.replace(/([.+^${}()|[\]\\])/g, '\\$1');
  }

  return new RegExp(`(?:^|/)${body}$`);
}

type GlobMatcher = (filePath: string) => boolean;

interface CombinedFastGlobMatchers {
  directMatchers: GlobMatcher[];
  literalSuffixes: string[];
  recursiveDirectoryNames: Set<string>;
  suffixes: string[];
}

type FastGlobPattern =
  | { kind: 'directChild'; directoryPath: string }
  | { kind: 'literal'; suffix: string }
  | { kind: 'recursiveDirectory'; directoryPath: string }
  | { kind: 'suffix'; suffix: string };

export function createGlobMatcher(pattern: string): GlobMatcher {
  const fastMatcher = createFastGlobMatcher(pattern);
  if (fastMatcher) {
    return fastMatcher;
  }

  const regex = globToRegex(pattern);
  return (filePath: string): boolean => regex.test(filePath);
}

function matchesPathSuffix(filePath: string, suffix: string): boolean {
  return filePath === suffix || filePath.endsWith(`/${suffix}`);
}

function createRecursiveDirectoryMatcher(directoryPath: string): GlobMatcher {
  const rootPrefix = `${directoryPath}/`;
  const nestedPrefix = `/${rootPrefix}`;

  return (filePath: string): boolean => (
    filePath.startsWith(rootPrefix) || filePath.includes(nestedPrefix)
  );
}

function createDirectChildMatcher(directoryPath: string): GlobMatcher {
  const rootPrefix = `${directoryPath}/`;
  const nestedPrefix = `/${rootPrefix}`;

  return (filePath: string): boolean => {
    let start = 0;
    if (!filePath.startsWith(rootPrefix)) {
      const nestedStart = filePath.lastIndexOf(nestedPrefix);
      if (nestedStart < 0) {
        return false;
      }
      start = nestedStart + 1;
    }

    const remainder = filePath.slice(start + rootPrefix.length);
    return remainder.length > 0 && !remainder.includes('/');
  };
}

function createSuffixMatcher(suffix: string): GlobMatcher {
  const suffixLength = suffix.length;
  const suffixFirstCode = suffix.charCodeAt(0);
  return (filePath: string): boolean => (
    filePath.length >= suffixLength
    && filePath.charCodeAt(filePath.length - suffixLength) === suffixFirstCode
    && filePath.endsWith(suffix)
  );
}

function removeRecursivePrefix(pattern: string): string {
  return pattern.startsWith('**/') ? pattern.slice(3) : pattern;
}

function getExtensionSuffixPattern(pattern: string): string | undefined {
  const hasOnlyLeadingWildcard = pattern.startsWith('*.') && pattern.indexOf('*', 1) === -1;
  return hasOnlyLeadingWildcard && !pattern.includes('/') ? pattern.slice(1) : undefined;
}

function getDirectoryPattern(pattern: string, ending: '/**' | '/*'): string | undefined {
  if (!pattern.endsWith(ending)) {
    return undefined;
  }

  const directoryPath = pattern.slice(0, -ending.length);
  return directoryPath && !directoryPath.includes('*') ? directoryPath : undefined;
}

function classifyFastGlobPattern(pattern: string): FastGlobPattern | undefined {
  const recursivePattern = removeRecursivePrefix(pattern);

  if (!recursivePattern.includes('*')) {
    return { kind: 'literal', suffix: recursivePattern };
  }

  const suffix = getExtensionSuffixPattern(recursivePattern);
  if (suffix) {
    return { kind: 'suffix', suffix };
  }

  const recursiveDirectoryPath = getDirectoryPattern(recursivePattern, '/**');
  if (recursiveDirectoryPath) {
    return { kind: 'recursiveDirectory', directoryPath: recursiveDirectoryPath };
  }

  const directChildDirectoryPath = getDirectoryPattern(recursivePattern, '/*');
  return directChildDirectoryPath
    ? { kind: 'directChild', directoryPath: directChildDirectoryPath }
    : undefined;
}

function addFastMatcher(fastMatchers: CombinedFastGlobMatchers, pattern: FastGlobPattern): void {
  if (pattern.kind === 'literal') {
    fastMatchers.literalSuffixes.push(pattern.suffix);
    return;
  }

  if (pattern.kind === 'suffix') {
    fastMatchers.suffixes.push(pattern.suffix);
    return;
  }

  if (pattern.kind === 'directChild') {
    fastMatchers.directMatchers.push(createDirectChildMatcher(pattern.directoryPath));
    return;
  }

  if (!pattern.directoryPath.includes('/')) {
    fastMatchers.recursiveDirectoryNames.add(pattern.directoryPath);
    return;
  }

  fastMatchers.directMatchers.push(createRecursiveDirectoryMatcher(pattern.directoryPath));
}

function collectFastMatcher(
  fastMatchers: CombinedFastGlobMatchers,
  pattern: string,
): boolean {
  const fastPattern = classifyFastGlobPattern(pattern);
  if (!fastPattern) {
    return false;
  }

  addFastMatcher(fastMatchers, fastPattern);
  return true;
}

function matchesAnyPathSuffix(filePath: string, suffixes: readonly string[]): boolean {
  for (const suffix of suffixes) {
    if (matchesPathSuffix(filePath, suffix)) {
      return true;
    }
  }

  return false;
}

function hasAnySuffix(filePath: string, suffixes: readonly string[]): boolean {
  for (const suffix of suffixes) {
    if (filePath.endsWith(suffix)) {
      return true;
    }
  }

  return false;
}

function containsRecursiveDirectoryName(
  filePath: string,
  directoryNames: ReadonlySet<string>,
): boolean {
  if (directoryNames.size === 0) {
    return false;
  }

  let segmentStart = 0;
  while (segmentStart < filePath.length) {
    const slashIndex = filePath.indexOf('/', segmentStart);
    if (slashIndex < 0) {
      return false;
    }

    if (directoryNames.has(filePath.slice(segmentStart, slashIndex))) {
      return true;
    }

    segmentStart = slashIndex + 1;
  }

  return false;
}

function createFastGlobMatcher(pattern: string): GlobMatcher | undefined {
  if (!pattern) {
    return () => false;
  }

  const fastPattern = classifyFastGlobPattern(pattern);
  if (!fastPattern) {
    return undefined;
  }

  if (fastPattern.kind === 'literal') {
    return (filePath: string): boolean => matchesPathSuffix(filePath, fastPattern.suffix);
  }

  if (fastPattern.kind === 'suffix') {
    return createSuffixMatcher(fastPattern.suffix);
  }

  return fastPattern.kind === 'directChild'
    ? createDirectChildMatcher(fastPattern.directoryPath)
    : createRecursiveDirectoryMatcher(fastPattern.directoryPath);
}

function collectCombinedFastMatchers(patterns: readonly string[]): {
  fastMatchers: CombinedFastGlobMatchers;
  regexPatterns: string[];
} {
  const fastMatchers: CombinedFastGlobMatchers = {
    directMatchers: [],
    literalSuffixes: [],
    recursiveDirectoryNames: new Set(),
    suffixes: [],
  };
  const regexPatterns: string[] = [];
  for (const pattern of patterns) {
    if (!collectFastMatcher(fastMatchers, pattern)) {
      regexPatterns.push(pattern);
    }
  }

  return { fastMatchers, regexPatterns };
}

function createCombinedRegexMatcher(regexPatterns: readonly string[]): RegExp | null {
  return regexPatterns.length > 0
    ? new RegExp(regexPatterns.map(pattern => `(?:${globToRegex(pattern).source})`).join('|'))
    : null;
}

function createCombinedFastMatcher(
  fastMatchers: CombinedFastGlobMatchers,
  regex: RegExp | null,
): GlobMatcher {
  return (filePath: string): boolean => {
    if (
      containsRecursiveDirectoryName(filePath, fastMatchers.recursiveDirectoryNames)
      || hasAnySuffix(filePath, fastMatchers.suffixes)
      || matchesAnyPathSuffix(filePath, fastMatchers.literalSuffixes)
    ) {
      return true;
    }

    for (const matcher of fastMatchers.directMatchers) {
      if (matcher(filePath)) {
        return true;
      }
    }

    return regex ? regex.test(filePath) : false;
  };
}

export function createCombinedGlobMatcher(patterns: readonly string[]): (filePath: string) => boolean {
  if (patterns.length === 0) {
    return () => false;
  }

  if (patterns.length === 1) {
    const pattern = patterns[0] ?? '';
    return createFastGlobMatcher(pattern) ?? createGlobMatcher(pattern);
  }

  const { fastMatchers, regexPatterns } = collectCombinedFastMatchers(patterns);
  const regex = regexPatterns.length > 0
    ? createCombinedRegexMatcher(regexPatterns)
    : null;
  return createCombinedFastMatcher(fastMatchers, regex);
}

export function globMatch(filePath: string, pattern: string): boolean {
  return createGlobMatcher(pattern)(filePath);
}
