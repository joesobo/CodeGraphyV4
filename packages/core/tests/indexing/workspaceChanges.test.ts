import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createEmptyWorkspaceAnalysisCache,
  createWorkspaceFileContentHash,
} from '../../src/analysis/cache';
import { findChangedWorkspaceIndexFiles } from '../../src/indexing/workspace/changes';

async function createFileFixture() {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-changes-'));
  const absolutePath = path.join(workspaceRoot, 'app.ts');
  await fs.writeFile(absolutePath, 'same');
  await fs.utimes(absolutePath, 1000.0005, 1000.0005);
  const stat = await fs.stat(absolutePath);
  return {
    absolutePath,
    file: { absolutePath, relativePath: 'app.ts', extension: '.ts', name: 'app.ts' },
    stat,
  };
}

describe('indexing/workspace changes', () => {
  it('does not read unchanged files with high-resolution metadata', async () => {
    const { file, stat } = await createFileFixture();
    const cache = createEmptyWorkspaceAnalysisCache();
    cache.files['app.ts'] = {
      mtime: stat.mtimeMs,
      size: stat.size,
      contentHash: createWorkspaceFileContentHash('same'),
      analysis: { filePath: file.absolutePath, relations: [] },
    };
    const readContent = vi.fn(async () => 'same');

    await expect(findChangedWorkspaceIndexFiles({ cache, files: [file], readContent }))
      .resolves.toEqual([]);
    expect(readContent).not.toHaveBeenCalled();
  });

  it('reuses analysis and refreshes metadata for a content-preserving touch', async () => {
    const { absolutePath, file, stat } = await createFileFixture();
    const cache = createEmptyWorkspaceAnalysisCache();
    cache.files['app.ts'] = {
      mtime: stat.mtimeMs - 10,
      size: stat.size,
      contentHash: createWorkspaceFileContentHash('same'),
      analysis: { filePath: file.absolutePath, relations: [] },
    };
    const readContent = vi.fn(async () => fs.readFile(absolutePath, 'utf8'));

    await expect(findChangedWorkspaceIndexFiles({ cache, files: [file], readContent }))
      .resolves.toEqual([]);
    expect(readContent).toHaveBeenCalledOnce();
    expect(cache.files['app.ts']?.mtime).toBe(stat.mtimeMs);
  });
});
