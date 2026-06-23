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

export function createGlobMatcher(pattern: string): (filePath: string) => boolean {
  const regex = globToRegex(pattern);
  return (filePath: string): boolean => regex.test(filePath);
}

export function createCombinedGlobMatcher(patterns: readonly string[]): (filePath: string) => boolean {
  if (patterns.length === 0) {
    return () => false;
  }

  if (patterns.length === 1) {
    return createGlobMatcher(patterns[0] ?? '');
  }

  const regex = new RegExp(
    patterns
      .map(pattern => `(?:${globToRegex(pattern).source})`)
      .join('|'),
  );

  return (filePath: string): boolean => regex.test(filePath);
}

export function globMatch(filePath: string, pattern: string): boolean {
  return createGlobMatcher(pattern)(filePath);
}
