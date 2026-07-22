import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { describe, expect, it } from 'vitest';

import { indexCodeGraphyWorkspace } from '../../src/indexing/workspace';
import { requestWorkspaceGraphQuery } from '../../src/workspace/requestQuery';
import { writeCodeGraphyWorkspaceSettings } from '../../src/workspace/settings';

describe('core-backed CodeGraphy Workspace plugin visibility', () => {
  it('excludes disabled plugin facts from graph query reports', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-disabled-plugin-'));
    const entryPath = path.join(workspaceRoot, 'entry.plug');
    const targetPath = path.join(workspaceRoot, 'target.plug');
    const pluginId = 'example.query-plugin';
    const pluginSymbolId = `${entryPath}#PluginSymbol`;
    const plugin: IPlugin = {
      id: pluginId,
      name: 'Example Query Plugin',
      version: '1.0.0',
      apiVersion: '^3.0.0',
      supportedExtensions: ['.plug'],
      async analyzeFile(filePath) {
        if (filePath !== entryPath) {
          return { filePath, relations: [] };
        }

        return {
          filePath,
          symbols: [{
            id: pluginSymbolId,
            name: 'PluginSymbol',
            kind: 'example',
            filePath,
            metadata: { pluginId },
          }],
          relations: [{
            kind: 'reference',
            pluginId,
            sourceId: 'plugin-reference',
            fromFilePath: entryPath,
            toFilePath: targetPath,
            toSymbolId: pluginSymbolId,
          }],
        };
      },
    };

    await fs.writeFile(entryPath, 'entry\n', 'utf-8');
    await fs.writeFile(targetPath, 'target\n', 'utf-8');
    await indexCodeGraphyWorkspace({
      workspaceRoot,
      includeCorePlugins: false,
      plugins: [plugin],
      settings: {
        version: 1,
        maxFiles: 1000,
        include: ['**/*'],
        respectGitignore: true,
        showOrphans: true,
        filterPatterns: [],
        disabledCustomFilterPatterns: [],
        plugins: [{ id: pluginId, activation: 'enabled' }],
        pluginData: {},
      },
    });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      version: 1,
      maxFiles: 1000,
      include: ['**/*'],
      respectGitignore: true,
      showOrphans: true,
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      plugins: [{ id: pluginId, activation: 'disabled' }],
      pluginData: {},
    });

    const edgeReport = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'edges',
      arguments: {},
    });
    const relationshipReport = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'relationships',
      arguments: {},
    });
    const symbolReport = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'symbols',
      arguments: {},
    });

    expect(edgeReport.edges).toEqual([]);
    expect(relationshipReport.relationships).toEqual([]);
    expect(symbolReport.symbols).toEqual([]);
  });

  it('excludes plugin facts from graph query reports when the workspace activity entry is absent', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-query-absent-plugin-'));
    const entryPath = path.join(workspaceRoot, 'entry.plug');
    const targetPath = path.join(workspaceRoot, 'target.plug');
    const pluginId = 'example.absent-query-plugin';
    const pluginSymbolId = `${entryPath}#AbsentPluginSymbol`;
    const plugin: IPlugin = {
      id: pluginId,
      name: 'Absent Query Plugin',
      version: '1.0.0',
      apiVersion: '^3.0.0',
      supportedExtensions: ['.plug'],
      async analyzeFile(filePath) {
        if (filePath !== entryPath) {
          return { filePath, relations: [] };
        }

        return {
          filePath,
          symbols: [{
            id: pluginSymbolId,
            name: 'AbsentPluginSymbol',
            kind: 'example',
            filePath,
            metadata: { pluginId },
          }],
          relations: [{
            kind: 'reference',
            pluginId,
            sourceId: 'absent-plugin-reference',
            fromFilePath: entryPath,
            toFilePath: targetPath,
            toSymbolId: pluginSymbolId,
          }],
        };
      },
    };

    await fs.writeFile(entryPath, 'entry\n', 'utf-8');
    await fs.writeFile(targetPath, 'target\n', 'utf-8');
    await indexCodeGraphyWorkspace({
      workspaceRoot,
      includeCorePlugins: false,
      plugins: [plugin],
      settings: {
        version: 1,
        maxFiles: 1000,
        include: ['**/*'],
        respectGitignore: true,
        showOrphans: true,
        filterPatterns: [],
        disabledCustomFilterPatterns: [],
        plugins: [{ id: pluginId, activation: 'enabled' }],
        pluginData: {},
      },
    });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      version: 1,
      maxFiles: 1000,
      include: ['**/*'],
      respectGitignore: true,
      showOrphans: true,
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      plugins: [],
      pluginData: {},
    });

    const edgeReport = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'edges',
      arguments: {},
    });
    const relationshipReport = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'relationships',
      arguments: {},
    });
    const symbolReport = await requestWorkspaceGraphQuery({
      workspacePath: workspaceRoot,
      report: 'symbols',
      arguments: {},
    });

    expect(edgeReport.edges).toEqual([]);
    expect(relationshipReport.relationships).toEqual([]);
    expect(symbolReport.symbols).toEqual([]);
  });
});
