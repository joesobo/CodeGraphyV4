import path from 'node:path';
import type { NativeProblemCounts } from './model';

interface DiagnosticLike {
  severity: number;
}

interface UriLike {
  fsPath: string;
}

export interface CollectWorkspaceProblemsInput {
  diagnostics: readonly (readonly [UriLike, readonly DiagnosticLike[]])[];
  workspaceRoots: readonly string[];
}

export function collectWorkspaceProblems({
  diagnostics,
  workspaceRoots,
}: CollectWorkspaceProblemsInput): Map<string, NativeProblemCounts> {
  const problems = new Map<string, NativeProblemCounts>();
  for (const [uri, fileDiagnostics] of diagnostics) {
    if (!workspaceRoots.some(root => isWithinWorkspace(uri.fsPath, root))) continue;

    const counts = fileDiagnostics.reduce<NativeProblemCounts>((result, diagnostic) => {
      if (diagnostic.severity === 0) result.errors += 1;
      if (diagnostic.severity === 1) result.warnings += 1;
      return result;
    }, { errors: 0, warnings: 0 });
    if (counts.errors + counts.warnings > 0) problems.set(uri.fsPath, counts);
  }
  return problems;
}

function isWithinWorkspace(filePath: string, workspaceRoot: string): boolean {
  const relativePath = path.relative(workspaceRoot, filePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}
