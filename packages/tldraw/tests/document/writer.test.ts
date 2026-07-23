import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { IGraphData } from '@codegraphy-dev/core';
import { describe, expect, it } from 'vitest';
import { readTldrawArchive, writeTldrawArchive } from '../../src/document/archive';
import { writeGraphDocument } from '../../src/document/writer';

describe('writeGraphDocument', () => {
  it('creates a native tldraw document from the default file graph', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'codegraphy-tldraw-writer-'));
    const targetPath = path.join(directory, 'workspace.tldraw');
    const graph = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', nodeType: 'file' },
        { id: 'symbol:a', label: 'a', nodeType: 'function' },
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

  it('stores the initial force settings in a new document', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'codegraphy-tldraw-writer-'));
    const targetPath = path.join(directory, 'workspace.tldraw');

    await writeGraphDocument({
      graph: { nodes: [], edges: [] },
      scriptFiles: { 'main.js': 'export default function main() {}\n' },
      targetPath,
    });

    const archive = await readTldrawArchive(targetPath);
    expect(archive.records.find(record => record.typeName === 'page')?.meta).toMatchObject({
      codegraphyPhysics: {
        repelForce: 10,
        centerForce: 0.1,
        linkDistance: 80,
        linkForce: 1,
      },
    });
  });

  it('preserves user asset files when it refreshes a saved document', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'codegraphy-tldraw-writer-'));
    const targetPath = path.join(directory, 'workspace.tldraw');
    await writeTldrawArchive({
      assetFiles: { 'user/photo.png': Buffer.from('user image bytes') },
      displayName: 'workspace',
      records: [],
      scriptFiles: { 'main.js': 'old script' },
      targetPath,
    });

    await writeGraphDocument({
      graph: { nodes: [], edges: [] },
      scriptFiles: { 'main.js': 'new script' },
      targetPath,
    });

    const archive = await readTldrawArchive(targetPath);
    expect(archive.assetFiles).toEqual({
      'user/photo.png': Buffer.from('user image bytes'),
    });
    expect(archive.scriptFiles['main.js']).toEqual(Buffer.from('new script'));
  });
});
