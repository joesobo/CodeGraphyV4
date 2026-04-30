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
  const segments = pattern.split('**');
  const body = segments
    .map((segment) =>
      segment
        .replace(/([.+^${}()|[\]\\])/g, '\\$1')
        .replace(/\*/g, '[^/]*')
    )
    .join('.*');

  return new RegExp(`(?:^|/)${body}$`);
}

export function globMatch(filePath: string, pattern: string): boolean {
  return globToRegex(pattern).test(filePath);
}
