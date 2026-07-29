import { readFileSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('node:fs', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs')>();
  return { ...original, readFileSync: vi.fn(original.readFileSync) };
});
import { createWorkspaceFileContentHash } from '../../src/analysis/cache';
import { requestCodeGraphyIndexWorkspace } from '../../src/workspace/requestIndexing';
import {
  projectWorkspaceQueryGraph,
  readWorkspaceQuerySource,
  readWorkspaceQuerySourceText,
} from '../../src/workspace/queryGraph';

describe('workspace/queryGraph', () => {
  it('projects independent Filters without mutating the shared query source', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-source-'));
    await fs.writeFile(
      path.join(workspaceRoot, 'entry.ts'),
      "import { modelValue } from './model';\nexport const entryValue = modelValue;\n",
    );
    await fs.writeFile(path.join(workspaceRoot, 'model.ts'), 'export const modelValue = 1;\n');
    await requestCodeGraphyIndexWorkspace({ workspacePath: workspaceRoot });
    const source = readWorkspaceQuerySource(workspaceRoot, { version: 3, plugins: [] });

    const filtered = projectWorkspaceQueryGraph(source, { filterPatterns: ['model.ts'] });
    const complete = projectWorkspaceQueryGraph(source);

    expect(filtered.graphData.nodes.map(node => node.id)).toEqual(expect.arrayContaining(['entry.ts']));
    expect(filtered.graphData.nodes.map(node => node.id)).not.toEqual(expect.arrayContaining([
      expect.stringContaining('model.ts'),
    ]));
    expect(filtered.snapshotFacts.symbols.map(symbol => symbol.filePath)).not.toContain('model.ts');
    expect(filtered.snapshotFacts.relations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ toFilePath: 'model.ts' }),
    ]));
    expect(complete.graphData.nodes.map(node => node.id)).toEqual(expect.arrayContaining(['entry.ts', 'model.ts']));
    expect(source.graphData.nodes.map(node => node.id)).toEqual(expect.arrayContaining(['entry.ts', 'model.ts']));
  });

  it('does not load oversized source files into memory', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-bounded-source-'));
    const largePath = path.join(workspaceRoot, 'large.ts');
    const largeContent = 'x'.repeat(1024 * 1024 + 1);
    await fs.writeFile(largePath, largeContent);
    vi.mocked(readFileSync).mockClear();

    const result = readWorkspaceQuerySourceText(workspaceRoot, {
      nodes: [{ id: 'large.ts', label: 'large.ts', nodeType: 'file' }],
      edges: [],
    }, new Map([['large.ts', createWorkspaceFileContentHash(largeContent)]]));

    expect(result).toMatchObject({ filesSkipped: 1, hasChangedFiles: false });
    expect(readFileSync).not.toHaveBeenCalledWith(largePath, 'utf8');
  });

  it('keeps unchanged indexed binary and oversized files fresh while skipping their source', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-skipped-freshness-'));
    const binaryContent = 'before\0after';
    const largeContent = 'x'.repeat(1024 * 1024 + 1);
    await fs.writeFile(path.join(workspaceRoot, 'binary.dat'), binaryContent);
    await fs.writeFile(path.join(workspaceRoot, 'large.ts'), largeContent);
    const graph = {
      nodes: [
        { id: 'binary.dat', label: 'binary.dat', nodeType: 'file' as const },
        { id: 'large.ts', label: 'large.ts', nodeType: 'file' as const },
      ],
      edges: [],
    };
    const indexedHashes = new Map([
      ['binary.dat', createWorkspaceFileContentHash(binaryContent)],
      ['large.ts', createWorkspaceFileContentHash(largeContent)],
    ]);

    const unchanged = readWorkspaceQuerySourceText(workspaceRoot, graph, indexedHashes);
    await fs.writeFile(path.join(workspaceRoot, 'large.ts'), `y${largeContent.slice(1)}`);
    const changed = readWorkspaceQuerySourceText(workspaceRoot, graph, indexedHashes);

    expect(unchanged).toMatchObject({ filesSkipped: 2, hasChangedFiles: false });
    expect(changed).toMatchObject({ filesSkipped: 2, hasChangedFiles: true });
  });

  it('skips binary, oversized, unreadable, and outside-workspace source files', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-text-'));
    await fs.writeFile(path.join(workspaceRoot, 'binary.dat'), 'before\0after');
    await fs.writeFile(path.join(workspaceRoot, 'large.ts'), Buffer.alloc(1024 * 1024 + 1));

    const result = readWorkspaceQuerySourceText(workspaceRoot, {
      nodes: [
        { id: 'binary.dat', label: 'binary.dat', nodeType: 'file' },
        { id: 'large.ts', label: 'large.ts', nodeType: 'file' },
        { id: 'missing.ts', label: 'missing.ts', nodeType: 'file' },
        { id: '../outside.ts', label: 'outside.ts', nodeType: 'file' },
        { id: 'folder', label: 'folder', nodeType: 'folder' },
      ],
      edges: [],
    });

    expect(result).toEqual({
      files: [],
      filesScanned: 0,
      filesSkipped: 4,
      hasChangedFiles: false,
    });
  });
});
