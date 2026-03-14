import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect } from 'vitest';
import {
  createResolverFsOps,
  normalizePathSlashes,
  toWorkspaceAbsolute,
  toWorkspaceRelative,
} from '../src/pathResolverFs';

describe('pathResolverFs', () => {
  it('detects existing files and directories in a workspace', () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'csharp-fs-'));
    const sourceDir = path.join(workspaceRoot, 'src');
    const filePath = path.join(sourceDir, 'Program.cs');

    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(filePath, 'public class Program {}', 'utf-8');

    const fsOps = createResolverFsOps(workspaceRoot);

    expect(fsOps.fileExists('src/Program.cs')).toBe(true);
    expect(fsOps.fileExists('src')).toBe(false);
    expect(fsOps.directoryExists('src')).toBe(true);
    expect(fsOps.directoryExists('src/Program.cs')).toBe(false);
    expect(fsOps.findCsFileInDir('src')).toBe('src/Program.cs');

    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('returns null when no .cs file is found in a directory', () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'csharp-fs-'));
    const sourceDir = path.join(workspaceRoot, 'src');

    fs.mkdirSync(sourceDir, { recursive: true });
    fs.writeFileSync(path.join(sourceDir, 'readme.txt'), 'x', 'utf-8');

    const fsOps = createResolverFsOps(workspaceRoot);

    expect(fsOps.findCsFileInDir('src')).toBeNull();

    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('normalizes path slashes and workspace conversions', () => {
    expect(normalizePathSlashes('src\\Services\\UserService.cs')).toBe('src/Services/UserService.cs');
    expect(toWorkspaceAbsolute('/workspace', 'src/Program.cs')).toBe('/workspace/src/Program.cs');
    expect(toWorkspaceRelative('/workspace', '/workspace/src/Program.cs')).toBe('src/Program.cs');
    expect(toWorkspaceRelative('/workspace', '/tmp/External.cs')).toBe('/tmp/External.cs');
  });
});
