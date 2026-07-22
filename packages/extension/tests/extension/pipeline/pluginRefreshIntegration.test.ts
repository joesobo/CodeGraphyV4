import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { readCodeGraphyWorkspaceSettings, writeCodeGraphyWorkspaceSettings } from '@codegraphy-dev/core';
import { WorkspacePipeline } from '../../../src/extension/pipeline/service/lifecycleFacade';

let workspaceFoldersValue: vscode.WorkspaceFolder[] | undefined;
Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots) fs.rmSync(root, { recursive: true, force: true });
  tempRoots.length = 0;
  vi.unstubAllEnvs();
});

describe('WorkspacePipeline plugin refresh integration', { timeout: 30_000 }, () => {
  it.each([
    ['svelte', 'codegraphy.svelte', 'packages/plugin-svelte'],
    ['godot', 'codegraphy.gdscript', 'packages/plugin-godot'],
  ])('restores %s facts after disable and targeted re-enable', async (example, pluginId, pluginRoot) => {
    const repoRoot = path.resolve(__dirname, '../../../../..');
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), `codegraphy-${example}-refresh-`));
    tempRoots.push(workspaceRoot);
    fs.cpSync(path.join(repoRoot, 'examples', `example-${example}`), workspaceRoot, { recursive: true });
    workspaceFoldersValue = [{
      index: 0,
      name: example,
      uri: vscode.Uri.file(workspaceRoot),
    }];
    vi.stubEnv('CODEGRAPHY_BUNDLED_PLUGIN_PACKAGE_ROOTS', path.join(repoRoot, pluginRoot));

    const analyzer = new WorkspacePipeline({
      subscriptions: [],
      extensionUri: vscode.Uri.file(repoRoot),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    } as unknown as vscode.ExtensionContext);
    await analyzer.initialize();
    const initialGraph = await analyzer.refreshIndex();
    expect(initialGraph.edges.some(edge => edge.sources.some(source => source.pluginId === pluginId))).toBe(true);

    const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...settings,
      plugins: settings.plugins.map(plugin => (
        plugin.id === pluginId ? { ...plugin, activation: 'disabled' as const } : plugin
      )),
    });
    await analyzer.syncWorkspacePlugins();
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...settings,
      plugins: settings.plugins.map(plugin => (
        plugin.id === pluginId ? { ...plugin, activation: 'enabled' as const } : plugin
      )),
    });
    await analyzer.syncWorkspacePlugins();

    const refreshedGraph = await analyzer.refreshPluginFiles([pluginId]);
    expect(refreshedGraph.edges.some(edge => edge.sources.some(source => source.pluginId === pluginId))).toBe(true);
  });
});
