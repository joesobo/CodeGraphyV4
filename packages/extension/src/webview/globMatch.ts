/**
 * Lightweight glob-to-regex matcher for the webview.
 *
 * Replaces `minimatch` which relies on Node.js globals (`process.platform`)
 * that are unavailable inside VS Code's webview sandbox.
 *
 * Supported patterns:
 *  - `*.ext`     — matches any filename ending with `.ext` (e.g. `*.gd`)
 *  - `src/*`     — matches files directly inside any `src/` folder
 *  - `src/**`    — matches files at any depth under any `src/` folder
 *  - `*.test.*`  — multiple wildcards
 *  - `file.txt`  — exact basename match
 */

/**
 * Convert a simple glob pattern to a RegExp.
 *
 * Rules:
 *  - `**` → match any path segments (including nested `/`)
 *  - `*`  → match anything except `/`
 *  - `.`  → escaped literal dot
 *  - All other regex meta-characters are escaped
 *
 * Patterns are matched against the basename or path suffix, so `src/*`
 * works anywhere in the tree while still keeping `*` and `**` semantics.
 */
export function globToRegex(pattern: string): RegExp {
  // Escape regex special chars except * which we handle
  // Split on ** first, process each segment for single *, then rejoin with .*
  const segments = pattern.split('**');
  const body = segments
    .map(seg =>
      seg
        .replace(/([.+^${}()|[\]\\])/g, '\\$1')
        .replace(/\*/g, '[^/]*')
    )
    .join('.*');

  return new RegExp(`(?:^|/)${body}$`);
}

/**
 * Test whether a file path matches a glob pattern.
 *
 * @param filePath - Forward-slash-separated relative path (e.g. `src/main.gd`)
 * @param pattern  - Glob pattern (e.g. `*.gd`, `src/*`)
 */
export function globMatch(filePath: string, pattern: string): boolean {
  return globToRegex(pattern).test(filePath);
}
