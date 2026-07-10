import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import type { BenchmarkFixture } from '../../src/fixture/presets';
import { writeObsidianVault } from '../../src/obsidian/vault';

const fixture: BenchmarkFixture = {
  schemaVersion: 1,
  source: { kind: 'synthetic', name: '1k', seed: 307, generatorVersion: 1 },
  graph: {
    nodes: [
      { id: 'src/a.ts', label: 'a.ts', color: '#fff' },
      { id: 'src/b.ts', label: 'b.ts', color: '#fff' },
    ],
    edges: [{
      id: 'src/a.ts->src/b.ts#import',
      from: 'src/a.ts',
      to: 'src/b.ts',
      kind: 'import',
      sources: [],
    }],
  },
  summary: { nodeCount: 2, edgeCount: 1, orphanCount: 0 },
  fixtureHash: 'sha256:test-fixture',
};

describe('writeObsidianVault', () => {
  it('writes one note per node and one wikilink per edge', async () => {
    const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'codegraphy-vault-'));
    const outputDirectory = path.join(temporaryRoot, 'vault');

    try {
      await writeObsidianVault(fixture, outputDirectory);

      const files = (await readdir(outputDirectory)).sort();
      const firstNote = await readFile(path.join(outputDirectory, 'node-000000.md'), 'utf8');
      const manifest = JSON.parse(
        await readFile(path.join(outputDirectory, 'codegraphy-fixture.json'), 'utf8'),
      ) as { fixtureHash: string; nodeCount: number; edgeCount: number };

      expect(files).toEqual([
        'codegraphy-fixture.json',
        'node-000000.md',
        'node-000001.md',
      ]);
      expect(firstNote).toContain('[[node-000001]]');
      expect(manifest).toEqual({
        fixtureHash: 'sha256:test-fixture',
        nodeCount: 2,
        edgeCount: 1,
      });
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  });
});
