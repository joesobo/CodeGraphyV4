import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PathResolver } from '../src/PathResolver';

describe('Markdown PathResolver', () => {
  let workspaceRoot: string;
  let sourceFile: string;

  beforeEach(() => {
    workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-markdown-path-'));
    sourceFile = path.join(workspaceRoot, 'Source.md');
  });

  afterEach(() => {
    fs.rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('resolves a case-insensitive indexed filename to a matching file', () => {
    const resolver = new PathResolver(workspaceRoot);
    const filePath = path.join(workspaceRoot, 'Design.md');
    resolver.buildIndex([{ absolutePath: filePath }]);

    const result = resolver.resolve('design', sourceFile);

    expect(result).toBeNull();
  });

  it('resolves an indexed root-relative file path that includes the extension', () => {
    const resolver = new PathResolver(workspaceRoot);
    const filePath = path.join(workspaceRoot, 'docs', 'Design.md');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '# Design');
    resolver.buildIndex([{ absolutePath: filePath }]);

    const result = resolver.resolve('docs/Design.md', sourceFile);

    expect(result).toBe(filePath);
  });

  it('resolves a root-relative path with an inferred extension', () => {
    const resolver = new PathResolver(workspaceRoot);
    const filePath = path.join(workspaceRoot, 'docs', 'Guide.md');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '# Guide');
    resolver.buildIndex([{ absolutePath: filePath }]);

    const result = resolver.resolve('docs/Guide', sourceFile);

    expect(result).toBe(filePath);
  });

  it('returns null for whitespace-only targets', () => {
    const resolver = new PathResolver(workspaceRoot);
    resolver.buildIndex([]);

    const result = resolver.resolve('   ', sourceFile);

    expect(result).toBeNull();
  });

  it('returns null for heading-only targets after trimming', () => {
    const resolver = new PathResolver(workspaceRoot);
    resolver.buildIndex([]);

    const result = resolver.resolve('   #Heading', sourceFile);

    expect(result).toBeNull();
  });

  it('returns null for heading-only targets even when empty-stem files exist', () => {
    const resolver = new PathResolver(workspaceRoot);
    const emptyStemFile = path.join(workspaceRoot, '.md');
    fs.writeFileSync(emptyStemFile, '# Empty stem');
    resolver.buildIndex([{ absolutePath: emptyStemFile }]);

    const result = resolver.resolve('   #HeadingOnly', sourceFile);

    expect(result).toBeNull();
  });

  it('does not resolve heading-only targets even when an empty index key is present', () => {
    const resolver = new PathResolver(workspaceRoot);
    const internalResolver = resolver as unknown as {
      fileIndex: Map<string, string[]>;
    };
    internalResolver.fileIndex.set('', [path.join(workspaceRoot, 'ghost.md')]);

    const result = resolver.resolve('   #HeadingOnly', sourceFile);

    expect(result).toBeNull();
  });

  it('trims whitespace around target content before path resolution', () => {
    const resolver = new PathResolver(workspaceRoot);
    const targetPath = path.join(workspaceRoot, 'docs', 'Guide.md');
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, '# Guide');

    const result = resolver.resolve('  docs/Guide#Intro  ', sourceFile);

    expect(result).toBe(targetPath);
  });

  it('resolves windows-style backslash paths', () => {
    const resolver = new PathResolver(workspaceRoot);
    const targetPath = path.join(workspaceRoot, 'docs', 'Windows.md');
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, '# Windows');

    const result = resolver.resolve('docs\\Windows', sourceFile);

    expect(result).toBe(targetPath);
  });

  it('returns null when an indexed stem exists but has no candidate paths', () => {
    const resolver = new PathResolver(workspaceRoot);
    const internalResolver = resolver as unknown as {
      fileIndex: Map<string, string[]>;
    };
    internalResolver.fileIndex.set('empty', []);

    const result = resolver.resolve('empty', sourceFile);

    expect(result).toBeNull();
  });

  it('returns null for bare targets without a root-relative path', () => {
    const resolver = new PathResolver(workspaceRoot);
    const filePath = path.join(workspaceRoot, 'notes', 'Node.md');
    resolver.buildIndex([{ absolutePath: filePath }]);

    const result = resolver.resolve('Node', sourceFile);

    expect(result).toBeNull();
  });
});
