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

    expect(result).toBe(filePath);
  });

  it('resolves an indexed filename that includes the .md extension', () => {
    const resolver = new PathResolver(workspaceRoot);
    const filePath = path.join(workspaceRoot, 'Design.md');
    resolver.buildIndex([{ absolutePath: filePath }]);

    const result = resolver.resolve('Design.md', sourceFile);

    expect(result).toBe(filePath);
  });

  it('prefers the shortest path when multiple matches exist', () => {
    const resolver = new PathResolver(workspaceRoot);
    const shortest = path.join(workspaceRoot, 'Design.md');
    const deeper = path.join(workspaceRoot, 'notes', 'Design.md');
    resolver.buildIndex([
      { absolutePath: deeper },
      { absolutePath: shortest },
    ]);

    const result = resolver.resolve('Design', sourceFile);

    expect(result).toBe(shortest);
  });

  it('prefers the shortest path regardless of input order', () => {
    const resolver = new PathResolver(workspaceRoot);
    const shortest = path.join(workspaceRoot, 'Guide.md');
    const deeper = path.join(workspaceRoot, 'notes', 'Guide.md');
    resolver.buildIndex([
      { absolutePath: shortest },
      { absolutePath: deeper },
    ]);

    const result = resolver.resolve('Guide', sourceFile);

    expect(result).toBe(shortest);
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

  it('resolves root-relative paths with inferred .md extension', () => {
    const resolver = new PathResolver(workspaceRoot);
    const targetPath = path.join(workspaceRoot, 'docs', 'Guide.md');
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, '# Guide');

    const result = resolver.resolve('docs/Guide', sourceFile);

    expect(result).toBe(targetPath);
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

  it('keeps first discovered file when shortest candidates have equal path length', () => {
    const resolver = new PathResolver(workspaceRoot);
    const left = path.join(workspaceRoot, 'a', 'Node.md');
    const right = path.join(workspaceRoot, 'b', 'Node.md');
    resolver.buildIndex([
      { absolutePath: left },
      { absolutePath: right },
    ]);

    const result = resolver.resolve('Node', sourceFile);

    expect(left.length).toBe(right.length);
    expect(result).toBe(left);
  });
});
