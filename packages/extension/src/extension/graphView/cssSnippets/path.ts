import path from 'path';

export interface InvalidCssSnippetPath {
  warning: string;
}

export function resolveCssSnippetPath(
  snippet: string,
  workspaceRoot: string,
  exists: (filePath: string) => boolean,
): string | InvalidCssSnippetPath {
  const invalidReason = invalidCssSnippetReason(snippet);
  if (invalidReason) {
    return { warning: `[CodeGraphy] CSS snippet ignored because ${invalidReason}: ${snippet}` };
  }

  const filePath = path.resolve(workspaceRoot, snippet);
  return exists(filePath)
    ? filePath
    : { warning: `[CodeGraphy] CSS snippet not found: ${snippet}` };
}

function invalidCssSnippetReason(snippet: string): string | undefined {
  if (path.isAbsolute(snippet)) {
    return 'absolute paths are not supported';
  }
  if (snippet.split(/[\\/]+/).some(segment => segment === '..')) {
    return 'parent traversal is not supported';
  }
  if (path.extname(snippet).toLowerCase() !== '.css') {
    return 'it is not a CSS file';
  }
  return undefined;
}
