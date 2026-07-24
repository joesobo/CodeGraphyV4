import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
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
    expect(result.graph.nodes.map(node => node.id)).not.toContain('.claude');
    expect(
      readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files.map(file => file.filePath),
    ).toEqual(['source.txt', 'target.txt']);
  });

  it('prunes cached eligible files displaced beyond the file budget', async () => {
    const workspaceRoot = await createWorkspace();
    const settings = {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      include: ['**/*.txt'],
      maxFiles: 2,
      respectGitignore: false,
    };

    await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [createPlugin()],
      includeCorePlugins: false,
      settings,
    });
    await fs.mkdir(path.join(workspaceRoot, '.early'), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, '.early', 'first.txt'), 'first\n', 'utf-8');
    await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [createPlugin()],
      includeCorePlugins: false,
      settings,
    });

    expect(
      readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files.map(file => file.filePath),
    ).toEqual(['.early/first.txt', 'source.txt']);
  });

  it('applies active plugin filters to the file budget and fresh Graph Cache', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.mkdir(path.join(workspaceRoot, '.generated'), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(workspaceRoot, '.generated', 'a.txt'), 'hidden\n', 'utf-8'),
      fs.writeFile(path.join(workspaceRoot, '.generated', 'b.txt'), 'hidden\n', 'utf-8'),
      fs.writeFile(path.join(workspaceRoot, '.generated', 'c.txt'), 'hidden\n', 'utf-8'),
    ]);

    const result = await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [{ ...createPlugin(), defaultFilters: ['.generated/**'] }],
      includeCorePlugins: false,
      settings: {
        ...readCodeGraphyWorkspaceSettings(workspaceRoot),
        include: ['**/*.txt'],
        maxFiles: 2,
        respectGitignore: false,
      },
    });

    expect(result.files.map(file => file.relativePath)).toEqual([
      'source.txt',
      'target.txt',
    ]);
    expect(
      readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files.map(file => file.filePath),
    ).toEqual(['source.txt', 'target.txt']);
  });

  it('retains cached files when a plugin filter is re-enabled', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.mkdir(path.join(workspaceRoot, '.generated'), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, '.generated', 'notes.txt'), 'hidden\n', 'utf-8');
    const plugin = { ...createPlugin(), defaultFilters: ['.generated/**'] };
    const baseSettings = {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      include: ['**/*.txt'],
      maxFiles: 10,
      respectGitignore: false,
      plugins: [{ id: plugin.id, activation: 'enabled' as const }],
    };

    await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [plugin],
      includeCorePlugins: false,
      settings: baseSettings,
    });
    await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [plugin],
      includeCorePlugins: false,
      settings: {
        ...baseSettings,
        plugins: [{
          ...baseSettings.plugins[0],
          disabledFilterPatterns: ['.generated/**'],
        }],
      },
    });
    const filteredAgain = await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [plugin],
      includeCorePlugins: false,
      settings: baseSettings,
    });

    expect(
      readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files.map(file => file.filePath),
    ).toContain('.generated/notes.txt');
    expect(filteredAgain.graph.nodes.map(node => node.id)).not.toContain('.generated/notes.txt');
  });

  it('retains cached files when a filter is re-enabled while keeping them out of the current graph', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.mkdir(path.join(workspaceRoot, '.claude'), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, '.claude', 'notes.txt'), 'hidden\n', 'utf-8');
    const baseSettings = {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      include: ['**/*.txt'],
      maxFiles: 10,
      respectGitignore: false,
      filterPatterns: ['.claude/**'],
    };

    await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [createPlugin()],
      includeCorePlugins: false,
      settings: baseSettings,
    });
    expect(
      readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files.map(file => file.filePath),
    ).not.toContain('.claude/notes.txt');

    await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [createPlugin()],
      includeCorePlugins: false,
      settings: {
        ...baseSettings,
        disabledCustomFilterPatterns: ['.claude/**'],
      },
    });
    expect(
      readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files.map(file => file.filePath),
    ).toContain('.claude/notes.txt');

    const filteredAgain = await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [createPlugin()],
      includeCorePlugins: false,
      settings: baseSettings,
    });

    expect(
      readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files.map(file => file.filePath),
    ).toContain('.claude/notes.txt');
    expect(filteredAgain.graph.nodes.map(node => node.id)).not.toContain('.claude/notes.txt');
  });

  it('fills the file budget with non-ignored files and keeps fresh Git-ignored files out of the Graph Cache', async () => {
    const workspaceRoot = await createWorkspace();
    execFileSync('git', ['init', '-q'], { cwd: workspaceRoot });
    await fs.mkdir(path.join(workspaceRoot, '.claude'), { recursive: true });
    await Promise.all([
      fs.writeFile(path.join(workspaceRoot, '.gitignore'), '.claude/\n', 'utf-8'),
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
        filterPatterns: [],
        maxFiles: 2,
        respectGitignore: true,
      },
    });

    expect(result.files.map(file => file.relativePath)).toEqual([
      'source.txt',
      'target.txt',
    ]);
    expect(
      readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files.map(file => file.filePath),
    ).toEqual(['source.txt', 'target.txt']);

    await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [createPlugin()],
      includeCorePlugins: false,
      settings: {
        ...readCodeGraphyWorkspaceSettings(workspaceRoot),
        include: ['**/*.txt'],
        maxFiles: 10,
        respectGitignore: false,
      },
    });
    const ignoredAgain = await indexCodeGraphyWorkspace({
      workspaceRoot,
      plugins: [createPlugin()],
      includeCorePlugins: false,
      settings: {
        ...readCodeGraphyWorkspaceSettings(workspaceRoot),
        include: ['**/*.txt'],
        maxFiles: 10,
        respectGitignore: true,
      },
    });

    expect(
      readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).files.map(file => file.filePath),
    ).toContain('.claude/a.txt');
    expect(ignoredAgain.graph.nodes.map(node => node.id)).not.toContain('.claude/a.txt');
  });
});
