import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { IFileAnalysisResult, IPlugin } from '@codegraphy-dev/plugin-api';
import { describe, expect, it, vi } from 'vitest';

import {
  indexCodeGraphyWorkspace,
  readWorkspaceAnalysisDatabaseSnapshot,
} from '../../src';

function createSymbolPlugin(analyzeFile: ReturnType<typeof vi.fn>): IPlugin {
  return {
    id: 'codegraphy.test-symbol-refresh',
    name: 'Test Symbol Refresh',
    version: '1.0.0',
    apiVersion: '^4.0.0',
    supportedExtensions: ['.ts'],
    async onFilesChanged() {
      return [];
    },
    async analyzeFile(filePath, content, workspaceRoot): Promise<IFileAnalysisResult> {
      analyzeFile(filePath, content, workspaceRoot);
      if (path.basename(filePath) === 'b.ts') {
        const targetVersion = content.trim();
        return {
          filePath,
          symbols: targetVersion === 'removed' ? [] : [{
            id: `${filePath}:target:${targetVersion}`,
            name: 'target',
            kind: 'function',
            filePath,
          }],
          relations: [],
        };
      }

      const targetPath = path.join(workspaceRoot, 'b.ts');
      const targetVersion = (await fs.readFile(targetPath, 'utf8')).trim();
      return {
        filePath,
        relations: targetVersion === 'removed' ? [] : [{
          kind: 'call',
          sourceId: 'call-target',
          fromFilePath: filePath,
          toFilePath: targetPath,
          resolvedPath: targetPath,
          metadata: { memberName: 'target' },
        }],
      };
    },
  };
}

describe('indexCodeGraphyWorkspace symbol lifecycle', () => {
  it('re-resolves cached source facts when a target symbol identity changes', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-symbol-refresh-'));
    await fs.writeFile(path.join(workspaceRoot, 'a.ts'), 'target();\n', 'utf8');
    await fs.writeFile(path.join(workspaceRoot, 'b.ts'), 'v1\n', 'utf8');
    const analyzeFile = vi.fn();
    const options = {
      workspaceRoot,
      includeCorePlugins: false,
      plugins: [createSymbolPlugin(analyzeFile)],
    };

    await indexCodeGraphyWorkspace(options);
    const initialFacts = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
    await fs.writeFile(path.join(workspaceRoot, 'b.ts'), 'v2\n', 'utf8');
    const refreshed = await indexCodeGraphyWorkspace(options);
    const refreshedFacts = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);

    expect(initialFacts.graph.edges).toContainEqual(expect.objectContaining({
      from: 'a.ts',
      to: 'b.ts#target:function',
      kind: 'call',
    }));
    expect(refreshed.indexing).toEqual({
      mode: 'incremental',
      analyzedFiles: 2,
      deletedFiles: 0,
      reusedFiles: 0,
    });
    expect(analyzeFile).toHaveBeenCalledTimes(4);
    expect(analyzeFile).toHaveBeenLastCalledWith(
      path.join(workspaceRoot, 'b.ts'),
      'v2\n',
      path.resolve(workspaceRoot),
    );
    expect(refreshedFacts.graph.edges).toContainEqual(expect.objectContaining({
      from: 'a.ts',
      to: 'b.ts#target:function',
      kind: 'call',
    }));
    expect(refreshedFacts.graph.edges).not.toContainEqual(expect.objectContaining({
      from: 'a.ts',
      to: 'b.ts',
      kind: 'call',
    }));
  });

  it('removes target-driven relationship evidence when a dependency changes', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-edge-refresh-'));
    await fs.writeFile(path.join(workspaceRoot, 'a.ts'), 'target();\n', 'utf8');
    await fs.writeFile(path.join(workspaceRoot, 'b.ts'), 'v1\n', 'utf8');
    const analyzeFile = vi.fn();
    const options = {
      workspaceRoot,
      includeCorePlugins: false,
      plugins: [createSymbolPlugin(analyzeFile)],
    };

    await indexCodeGraphyWorkspace(options);
    const initialFacts = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);
    await fs.writeFile(path.join(workspaceRoot, 'b.ts'), 'removed\n', 'utf8');
    const refreshed = await indexCodeGraphyWorkspace(options);
    const refreshedFacts = readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot);

    expect(initialFacts.graph.edges).toContainEqual(expect.objectContaining({
      from: 'a.ts',
      to: 'b.ts#target:function',
      kind: 'call',
    }));
    expect(refreshed.indexing).toEqual({
      mode: 'incremental',
      analyzedFiles: 2,
      deletedFiles: 0,
      reusedFiles: 0,
    });
    expect(refreshedFacts.graph.edges).not.toContainEqual(expect.objectContaining({
      from: 'a.ts',
      kind: 'call',
    }));
  });
});
