import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { IPlugin } from '@codegraphy/plugin-api';
import { describe, expect, it, vi } from 'vitest';

import {
  indexCodeGraphyWorkspace,
  readGraphCacheStatus,
  readWorkspaceAnalysisDatabaseSnapshot,
} from '../../src';

async function createWorkspace(): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-core-index-'));
  await fs.writeFile(path.join(workspaceRoot, 'source.txt'), 'target.txt\n', 'utf-8');
  await fs.writeFile(path.join(workspaceRoot, 'target.txt'), 'done\n', 'utf-8');
  return workspaceRoot;
}

function createTextPlugin(calls: {
  onPreAnalyze: ReturnType<typeof vi.fn>;
  onPostAnalyze: ReturnType<typeof vi.fn>;
  onWorkspaceReady: ReturnType<typeof vi.fn>;
  analyzeFile: ReturnType<typeof vi.fn>;
}): IPlugin {
  return {
    id: 'codegraphy.test-text',
    name: 'Test Text',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.txt'],
    sources: [{
      id: 'line-reference',
      name: 'Line Reference',
      description: 'References target files from text lines.',
    }],
    async onPreAnalyze(files, workspaceRoot) {
      calls.onPreAnalyze(files, workspaceRoot);
    },
    onPostAnalyze(graph) {
      calls.onPostAnalyze(graph);
    },
    onWorkspaceReady(graph) {
      calls.onWorkspaceReady(graph);
    },
    async analyzeFile(filePath, content, workspaceRoot) {
      calls.analyzeFile(filePath, content, workspaceRoot);

      if (path.basename(filePath) !== 'source.txt') {
        return { filePath, relations: [] };
      }

      const targetPath = path.join(workspaceRoot, content.trim());
      return {
        filePath,
        relations: [{
          kind: 'import',
          sourceId: 'line-reference',
          fromFilePath: filePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          specifier: content.trim(),
        }],
      };
    },
  };
}

describe('indexCodeGraphyWorkspace', () => {
  it('indexes an explicit folder through core plugins and writes the workspace Graph Cache', async () => {
    const workspaceRoot = await createWorkspace();
    const calls = {
      onPreAnalyze: vi.fn(),
      onPostAnalyze: vi.fn(),
      onWorkspaceReady: vi.fn(),
      analyzeFile: vi.fn(),
    };

    const result = await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [createTextPlugin(calls)],
      includeCorePlugins: false,
      showOrphans: true,
    });

    expect(result.workspaceRoot).toBe(path.resolve(workspaceRoot));
    expect(result.graph.nodes.map(node => node.id)).toEqual(
      expect.arrayContaining(['source.txt', 'target.txt']),
    );
    expect(result.graph.edges).toContainEqual(
      expect.objectContaining({
        from: 'source.txt',
        to: 'target.txt',
        kind: 'import',
      }),
    );
    expect(calls.onPreAnalyze).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ relativePath: 'source.txt' }),
        expect.objectContaining({ relativePath: 'target.txt' }),
      ]),
      path.resolve(workspaceRoot),
    );
    expect(calls.analyzeFile).toHaveBeenCalledTimes(2);
    expect(calls.onPostAnalyze).toHaveBeenCalledWith(result.graph);
    expect(calls.onWorkspaceReady).toHaveBeenCalledWith(result.graph);
    expect(readGraphCacheStatus(workspaceRoot).state).toBe('available');
    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files.map(file => file.filePath)).toEqual(
      expect.arrayContaining(['source.txt', 'target.txt']),
    );
  });
});
