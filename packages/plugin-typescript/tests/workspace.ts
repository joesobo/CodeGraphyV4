import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { IAnalysisRelationshipEvidence } from '@codegraphy-dev/plugin-api';

export function createWorkspaceRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-plugin-typescript-'));
}

export function writeWorkspaceFile(workspaceRoot: string, relativePath: string, contents: string): string {
  const absolutePath = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  return absolutePath;
}

export function removeWorkspaceRoot(workspaceRoot: string): void {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
}

export function expectedAliasImportRelation(
  sourcePath: string,
  targetPath: string,
  specifier: string,
): IAnalysisRelationshipEvidence {
  return {
    edgeType: 'codegraphy.typescript:alias-import',
    sourceId: 'compiler-options-paths',
    from: {
      kind: 'file',
      filePath: sourcePath,
    },
    target: {
      kind: 'file',
      path: targetPath,
      pathKind: 'absolute',
      specifier,
    },
    specifier,
  };
}
