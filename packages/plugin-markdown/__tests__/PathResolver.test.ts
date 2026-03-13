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

  it('resolves by indexed filename and prefers the shortest path when multiple matches exist', () => {
    const resolver = new PathResolver(workspaceRoot);
    const shortest = path.join(workspaceRoot, 'Design.md');
    const deeper = path.join(workspaceRoot, 'notes', 'Design.md');

    resolver.buildIndex([
      { absolutePath: deeper },
      { absolutePath: shortest },
    ]);

    expect(resolver.resolve('design', sourceFile)).toBe(shortest);
    expect(resolver.resolve('Design.md', sourceFile)).toBe(shortest);
  });

  it('still prefers the shortest path regardless of input order', () => {
    const resolver = new PathResolver(workspaceRoot);
    const shortest = path.join(workspaceRoot, 'Guide.md');
    const deeper = path.join(workspaceRoot, 'notes', 'Guide.md');

    resolver.buildIndex([
      { absolutePath: shortest },
      { absolutePath: deeper },
    ]);

    expect(resolver.resolve('Guide', sourceFile)).toBe(shortest);
  });

  it('returns null for empty targets after trimming and heading removal', () => {
    const resolver = new PathResolver(workspaceRoot);
    resolver.buildIndex([]);

    expect(resolver.resolve('   #Heading', sourceFile)).toBeNull();
    expect(resolver.resolve('   ', sourceFile)).toBeNull();
  });

  it('returns null for heading-only targets even when empty-stem files exist', () => {
    const resolver = new PathResolver(workspaceRoot);
    const emptyStemFile = path.join(workspaceRoot, '.md');
    fs.writeFileSync(emptyStemFile, '# Empty stem');
    resolver.buildIndex([{ absolutePath: emptyStemFile }]);

    expect(resolver.resolve('   #HeadingOnly', sourceFile)).toBeNull();
  });

  it('does not resolve heading-only targets even when an empty index key is present', () => {
    const resolver = new PathResolver(workspaceRoot);
    const internalResolver = resolver as unknown as {
      fileIndex: Map<string, string[]>;
    };

    internalResolver.fileIndex.set('', [path.join(workspaceRoot, 'ghost.md')]);

    expect(resolver.resolve('   #HeadingOnly', sourceFile)).toBeNull();
  });

  it('resolves root-relative paths with inferred .md extension', () => {
    const resolver = new PathResolver(workspaceRoot);
    const targetPath = path.join(workspaceRoot, 'docs', 'Guide.md');

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, '# Guide');

    expect(resolver.resolve('docs/Guide', sourceFile)).toBe(targetPath);
  });

  it('trims whitespace around target content before path resolution', () => {
    const resolver = new PathResolver(workspaceRoot);
    const targetPath = path.join(workspaceRoot, 'docs', 'Guide.md');
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, '# Guide');

    expect(resolver.resolve('  docs/Guide#Intro  ', sourceFile)).toBe(targetPath);
  });

  it('resolves windows-style backslash paths', () => {
    const resolver = new PathResolver(workspaceRoot);
    const targetPath = path.join(workspaceRoot, 'docs', 'Windows.md');

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, '# Windows');

    expect(resolver.resolve('docs\\Windows', sourceFile)).toBe(targetPath);
  });

  it('returns null when an indexed stem exists but has no candidate paths', () => {
    const resolver = new PathResolver(workspaceRoot);
    const internalResolver = resolver as unknown as {
      fileIndex: Map<string, string[]>;
    };

    internalResolver.fileIndex.set('empty', []);

    expect(resolver.resolve('empty', sourceFile)).toBeNull();
  });

  it('keeps first discovered file when shortest candidates have equal path length', () => {
    const resolver = new PathResolver(workspaceRoot);
    const left = path.join(workspaceRoot, 'a', 'Node.md');
    const right = path.join(workspaceRoot, 'b', 'Node.md');

    resolver.buildIndex([
      { absolutePath: left },
      { absolutePath: right },
    ]);

    expect(left.length).toBe(right.length);
    expect(resolver.resolve('Node', sourceFile)).toBe(left);
  });
});
