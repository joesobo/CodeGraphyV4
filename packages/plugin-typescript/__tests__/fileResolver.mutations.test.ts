import path from 'path';
import { describe, expect, it, vi } from 'vitest';

const { statSyncMock } = vi.hoisted(() => ({
  statSyncMock: vi.fn<(filePath: string) => never>(),
}));

vi.mock('fs', async () => ({
  statSync: statSyncMock,
}));

describe('resolveFile mutation guards', () => {
  it('probes supported extensions and index files in the documented order', async () => {
    statSyncMock.mockImplementation(() => {
      throw new Error('ENOENT');
    });

    const { resolveFile } = await import('../src/fileResolver');
    const basePath = '/workspace/src/module';

    expect(resolveFile(basePath)).toBeNull();
    expect(statSyncMock.mock.calls.map(([candidate]) => candidate)).toEqual([
      basePath,
      `${basePath}.ts`,
      `${basePath}.tsx`,
      `${basePath}.js`,
      `${basePath}.jsx`,
      `${basePath}.mjs`,
      `${basePath}.cjs`,
      `${basePath}.json`,
      path.join(basePath, 'index.ts'),
      path.join(basePath, 'index.tsx'),
      path.join(basePath, 'index.js'),
      path.join(basePath, 'index.jsx'),
    ]);
  });
});
