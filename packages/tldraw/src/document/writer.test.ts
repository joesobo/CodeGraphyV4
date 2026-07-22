import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IGraphData } from '@codegraphy-dev/core';
import { describe, expect, it } from 'vitest';
import { readTldrawArchive } from './archive';
import { writeGraphDocument } from './writer';

describe('writeGraphDocument', () => {
  it('creates a native tldraw document from the default file graph', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'codegraphy-tldraw-writer-'));
    const targetPath = path.join(directory, 'workspace.tldraw');
    const graph = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#111111', nodeType: 'file' },
        { id: 'symbol:a', label: 'a', color: '#222222', nodeType: 'function' },
      ],
      edges: [],
    } satisfies IGraphData;

    await writeGraphDocument({
      graph,
      scriptFiles: { 'main.js': 'export default function main() {}\n' },
      targetPath,
    });

    const archive = await readTldrawArchive(targetPath);
    expect(archive.records.some(record => (
      record.typeName === 'shape'
      && record.meta.codegraphyEntityId === 'a.ts'
    ))).toBe(true);
    expect(archive.records.some(record => record.meta.codegraphyEntityId === 'symbol:a')).toBe(false);
  });
});
