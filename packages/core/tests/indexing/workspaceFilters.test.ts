import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import {
  indexCodeGraphyWorkspace,
  readCodeGraphyWorkspaceSettings,
  readWorkspaceAnalysisDatabaseSnapshot,
} from '../../src';
import { createTextPlugin, createWorkspace } from './workspaceFixture';

function createPlugin() {
  return createTextPlugin({
    onPreAnalyze: vi.fn(),
    onPostAnalyze: vi.fn(),
    onWorkspaceReady: vi.fn(),
    analyzeFile: vi.fn(),
  });
}

describe('indexCodeGraphyWorkspace filters', () => {
  it('fills the file budget with unfiltered files and keeps fresh filtered files out of the Graph Cache', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.mkdir(path.join(workspaceRoot, '.claude'), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(workspaceRoot, '.claude', 'a.txt'), 'hidden\n', 'utf-8'),
      fs.writeFile(path.join(workspaceRoot, '.claude', 'b.txt'), 'hidden\n', 'utf-8'),
      fs.writeFile(path.join(workspaceRoot, '.claude', 'c.txt'), 'hidden\n', 'utf-8'),
    ]);

    const result = await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [createPlugin()],
      includeCorePlugins: false,
      settings: {
        ...readCodeGraphyWorkspaceSettings(workspaceRoot),
        include: ['**/*.txt'],
        filterPatterns: ['.claude/**'],
        maxFiles: 2,
        respectGitignore: false,
      },
    });

    expect(result.files.map(file => file.relativePath)).toEqual([
      'source.txt',
      'target.txt',
    ]);
    expect(result.graph.nodes.map(node => node.id)).toEqual(
      expect.arrayContaining(['source.txt', 'target.txt']),
    );
    expect(result.graph.nodes.map(node => node.id)).not.toContain('.claude/a.txt');
    expect(
      readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files.map(file => file.filePath),
    ).toEqual(['source.txt', 'target.txt']);
  });
});
