import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createMarkdownPlugin } from '../src';

interface AnalyzeFile {
  absolutePath: string;
  relativePath: string;
  content: string;
}

describe('Markdown plugin integration', () => {
  let workspaceA: string;
  let workspaceB: string;

  beforeEach(() => {
    workspaceA = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-markdown-a-'));
    workspaceB = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-markdown-b-'));
  });

  afterEach(() => {
    fs.rmSync(workspaceA, { recursive: true, force: true });
    fs.rmSync(workspaceB, { recursive: true, force: true });
  });

  function createMarkdownFile(workspaceRoot: string, relativePath: string): AnalyzeFile {
    const absolutePath = path.join(workspaceRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, `# ${relativePath}`);
    return {
      absolutePath,
      relativePath,
      content: `# ${relativePath}`,
    };
  }

  it('resolves root-relative wikilinks immediately after initialize', async () => {
    const plugin = createMarkdownPlugin();
    const target = createMarkdownFile(workspaceA, 'docs/Guide.md');

    await plugin.initialize?.(workspaceA);

    const connections = await plugin.detectConnections(
      path.join(workspaceA, 'Current.md'),
      '[[docs/Guide]]',
      workspaceA,
    );

    expect(connections).toHaveLength(1);
    expect(connections[0].resolvedPath).toBe(target.absolutePath);
  });

  it('updates workspace root and index between onPreAnalyze runs', async () => {
    const plugin = createMarkdownPlugin();
    const targetA = createMarkdownFile(workspaceA, 'docs/Shared.md');
    const targetB = createMarkdownFile(workspaceB, 'docs/Shared.md');

    await plugin.initialize?.(workspaceA);
    await plugin.onPreAnalyze?.([targetA], workspaceA);

    const firstPass = await plugin.detectConnections(
      path.join(workspaceA, 'Current.md'),
      '[[Shared]] and [[docs/Shared]]',
      workspaceA,
    );

    await plugin.onPreAnalyze?.([targetB], workspaceB);

    const secondPass = await plugin.detectConnections(
      path.join(workspaceB, 'Current.md'),
      '[[Shared]] and [[docs/Shared]]',
      workspaceB,
    );

    expect(firstPass.map((conn) => conn.resolvedPath)).toEqual([
      targetA.absolutePath,
      targetA.absolutePath,
    ]);
    expect(secondPass.map((conn) => conn.resolvedPath)).toEqual([
      targetB.absolutePath,
      targetB.absolutePath,
    ]);
  });
});
