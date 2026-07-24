import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmptyWorkspaceAnalysisCache } from '../../src/analysis/cache';
import type { IDiscoveredFile } from '../../src/discovery/contracts';
import { analyzeWorkspaceIndexFiles } from '../../src/indexing/analysis';

const tempRoots = new Set<string>();

async function createWorkspaceRoot(): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-index-analysis-'));
  tempRoots.add(workspaceRoot);
  return workspaceRoot;
}

function createDiscoveredFile(workspaceRoot: string, relativePath: string): IDiscoveredFile {
  const extension = path.extname(relativePath);
  return {
    absolutePath: path.join(workspaceRoot, relativePath),
    extension,
    name: path.basename(relativePath),
    relativePath,
  };
}

afterEach(async () => {
  await Promise.all([...tempRoots].map(workspaceRoot =>
    fs.rm(workspaceRoot, { recursive: true, force: true }),
  ));
  tempRoots.clear();
});

describe('indexing/analysis', () => {
  it('reuses pre-analysis file content for cold file analysis', async () => {
    const workspaceRoot = await createWorkspaceRoot();
    await fs.mkdir(path.join(workspaceRoot, 'src'), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, 'src/a.txt'), 'a -> b\n', 'utf-8');
    await fs.writeFile(path.join(workspaceRoot, 'src/b.txt'), 'b\n', 'utf-8');
    const files = [
      createDiscoveredFile(workspaceRoot, 'src/a.txt'),
      createDiscoveredFile(workspaceRoot, 'src/b.txt'),
    ];
    const readContent = vi.fn(async (file: IDiscoveredFile) =>
      fs.readFile(file.absolutePath, 'utf-8'),
    );

    await analyzeWorkspaceIndexFiles({
      cache: createEmptyWorkspaceAnalysisCache(),
      discovery: { readContent } as never,
      discoveryResult: {
        durationMs: 1,
        files,
        cacheFilePaths: files.map(file => file.relativePath),
        directories: [],
        gitIgnoredPaths: [],
        limitReached: false,
        totalFound: files.length,
      },
      disabledPlugins: new Set(),
      options: {
        workspaceRoot,
      },
      registry: {
        analyzeFileResult: vi.fn(async (absolutePath: string, content: string) => ({
          filePath: absolutePath,
          relations: [],
          symbols: content.trim().length > 0 ? [] : undefined,
        })),
        list: vi.fn(() => []),
        notifyPreAnalyze: vi.fn(async () => undefined),
      } as never,
      workspaceRoot,
    });

    expect(readContent).toHaveBeenCalledTimes(2);
    expect(readContent).toHaveBeenCalledWith(files[0]);
    expect(readContent).toHaveBeenCalledWith(files[1]);
  });
});
