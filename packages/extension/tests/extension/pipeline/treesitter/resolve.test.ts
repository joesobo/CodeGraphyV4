import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveTreeSitterImportPath } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/resolve';

const tempRoots = new Set<string>();

function createWorkspaceRoot(): string {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-treesitter-resolve-'));
  tempRoots.add(workspaceRoot);
  return workspaceRoot;
}

function writeWorkspaceFile(workspaceRoot: string, relativePath: string, contents = ''): string {
  const absolutePath = path.join(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  return absolutePath;
}

afterEach(() => {
  for (const workspaceRoot of tempRoots) {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  }
  tempRoots.clear();
});

describe('pipeline/plugins/treesitter/runtime/resolve', () => {
  it('resolves sibling source files across supported extensions', () => {
    const workspaceRoot = createWorkspaceRoot();
    const filePath = writeWorkspaceFile(workspaceRoot, 'src/app.ts', 'export {};\n');
    const utilPath = writeWorkspaceFile(workspaceRoot, 'src/util.tsx', 'export {};\n');

    expect(resolveTreeSitterImportPath(filePath, './util')).toBe(utilPath);
  });

  it('falls back to index files when the base path is a directory', () => {
    const workspaceRoot = createWorkspaceRoot();
    const filePath = writeWorkspaceFile(workspaceRoot, 'src/app.ts', 'export {};\n');
    const indexPath = writeWorkspaceFile(workspaceRoot, 'src/lib/index.js', 'export {};\n');

    expect(resolveTreeSitterImportPath(filePath, './lib')).toBe(indexPath);
  });

  it('returns null for bare module specifiers and unresolved relative paths', () => {
    const workspaceRoot = createWorkspaceRoot();
    const filePath = writeWorkspaceFile(workspaceRoot, 'src/app.ts', 'export {};\n');

    expect(resolveTreeSitterImportPath(filePath, 'react')).toBeNull();
    expect(resolveTreeSitterImportPath(filePath, './missing')).toBeNull();
  });
});
