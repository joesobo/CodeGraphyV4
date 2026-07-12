import type { ChurnCounts } from './cache';

const COMMIT_MARKER = '__CODEGRAPHY_COMMIT__';

function stripWorkspacePrefix(filePath: string, workspacePrefix: string): string | null {
  if (!workspacePrefix) return filePath;
  return filePath.startsWith(workspacePrefix)
    ? filePath.slice(workspacePrefix.length)
    : null;
}

function parseStatusLine(line: string): { status: string; paths: string[] } | null {
  const [status, ...paths] = line.split('\t');
  return status && paths.length > 0 ? { status, paths } : null;
}

export function parseChurnLog(
  output: string,
  currentFilePaths: readonly string[],
  workspacePrefix: string,
): ChurnCounts {
  const aliases = new Map(currentFilePaths.map(filePath => [filePath, filePath]));
  const counts: ChurnCounts = {};
  let touchedInCommit = new Set<string>();

  const count = (filePath: string): string | undefined => {
    const canonicalPath = aliases.get(filePath);
    if (!canonicalPath || touchedInCommit.has(canonicalPath)) return canonicalPath;
    touchedInCommit.add(canonicalPath);
    counts[canonicalPath] = (counts[canonicalPath] ?? 0) + 1;
    return canonicalPath;
  };

  for (const line of output.split('\n')) {
    if (line === COMMIT_MARKER) {
      touchedInCommit = new Set();
      continue;
    }
    const entry = parseStatusLine(line);
    if (!entry) continue;
    const paths = entry.paths
      .map(filePath => stripWorkspacePrefix(filePath, workspacePrefix))
      .filter((filePath): filePath is string => filePath !== null);

    if (entry.status.startsWith('R') && paths.length >= 2) {
      const [oldPath, newPath] = paths;
      const canonicalPath = count(newPath);
      if (canonicalPath) {
        aliases.delete(newPath);
        aliases.set(oldPath, canonicalPath);
      }
      continue;
    }

    const [filePath] = paths;
    if (!filePath) continue;
    count(filePath);
    if (entry.status === 'A') aliases.delete(filePath);
  }

  return counts;
}

export const churnGitFormat = COMMIT_MARKER;
