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

function collectFastMatcher(
  fastMatchers: CombinedFastGlobMatchers,
  pattern: string,
): boolean {
  const recursivePattern = pattern.startsWith('**/') ? pattern.slice(3) : pattern;

  if (!recursivePattern.includes('*')) {
    fastMatchers.literalSuffixes.push(recursivePattern);
    return true;
  }

  if (
    recursivePattern.startsWith('*.')
    && recursivePattern.indexOf('*', 1) === -1
    && !recursivePattern.includes('/')
  ) {
    fastMatchers.suffixes.push(recursivePattern.slice(1));
    return true;
  }

  if (recursivePattern.endsWith('/**')) {
    const directoryPath = recursivePattern.slice(0, -3);
    if (directoryPath && !directoryPath.includes('*')) {
      if (!directoryPath.includes('/')) {
        fastMatchers.recursiveDirectoryNames.add(directoryPath);
      } else {
        fastMatchers.directMatchers.push(createRecursiveDirectoryMatcher(directoryPath));
      }
      return true;
    }
  }

  if (recursivePattern.endsWith('/*')) {
    const directoryPath = recursivePattern.slice(0, -2);
    if (directoryPath && !directoryPath.includes('*')) {
      fastMatchers.directMatchers.push(createDirectChildMatcher(directoryPath));
      return true;
    }
  }

  return false;
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

  const recursivePattern = pattern.startsWith('**/') ? pattern.slice(3) : pattern;

  if (!recursivePattern.includes('*')) {
    return (filePath: string): boolean => matchesPathSuffix(filePath, recursivePattern);
  }

  if (
    recursivePattern.startsWith('*.')
    && recursivePattern.indexOf('*', 1) === -1
    && !recursivePattern.includes('/')
  ) {
    const suffix = recursivePattern.slice(1);
    return (filePath: string): boolean => filePath.endsWith(suffix);
  }

  if (recursivePattern.endsWith('/**')) {
    const directoryPath = recursivePattern.slice(0, -3);
    if (directoryPath && !directoryPath.includes('*')) {
      return createRecursiveDirectoryMatcher(directoryPath);
    }
  }

  if (recursivePattern.endsWith('/*')) {
    const directoryPath = recursivePattern.slice(0, -2);
    if (directoryPath && !directoryPath.includes('*')) {
      return createDirectChildMatcher(directoryPath);
    }
  }

  return undefined;
}

export function createCombinedGlobMatcher(patterns: readonly string[]): (filePath: string) => boolean {
  if (patterns.length === 0) {
    return () => false;
  }

  if (patterns.length === 1) {
    const pattern = patterns[0] ?? '';
    return createFastGlobMatcher(pattern) ?? createGlobMatcher(pattern);
  }

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

  const regex = regexPatterns.length > 0
    ? new RegExp(regexPatterns.map(pattern => `(?:${globToRegex(pattern).source})`).join('|'))
    : null;

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

export function globMatch(filePath: string, pattern: string): boolean {
  return createGlobMatcher(pattern)(filePath);
}
