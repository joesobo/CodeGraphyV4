import { afterEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import { WorkspacePipeline } from '../../../src/extension/pipeline/service/lifecycleFacade';
import {
  createPluginIntegrationWorkspace,
  installPluginIntegrationPackage,
  type PluginIntegrationWorkspace,
} from '../pluginIntegration/workspaceFixture';

let workspaceFoldersValue: vscode.WorkspaceFolder[] | undefined;
let workspaceFixture: PluginIntegrationWorkspace | undefined;

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

afterEach(async () => {
  await workspaceFixture?.cleanup();
  workspaceFixture = undefined;
  workspaceFoldersValue = undefined;
  vi.unstubAllEnvs();
});

describe('WorkspacePipeline plugin refresh integration', { timeout: 30_000 }, () => {
  it('restores package plugin facts after disable and targeted re-enable', async () => {
    workspaceFixture = await createPluginIntegrationWorkspace();
    const installedPackage = await installPluginIntegrationPackage(
      workspaceFixture.workspacePath,
      workspaceFixture.scratchPath,
    );
    workspaceFoldersValue = [{
      index: 0,
      name: 'workspace',
      uri: vscode.Uri.file(workspaceFixture.workspacePath),
    }];
    vi.stubEnv('HOME', installedPackage.homeDir);

    const analyzer = new WorkspacePipeline({
      subscriptions: [],
      extensionUri: vscode.Uri.file('/test/extension'),
      workspaceState: {
        get: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      },
    } as unknown as vscode.ExtensionContext);
    await analyzer.initialize();
    const initialGraph = await analyzer.refreshIndex();
    expect(hasPluginEdge(initialGraph, installedPackage.pluginId)).toBe(true);

    setPluginActivation(workspaceFixture.workspacePath, installedPackage.pluginId, 'disabled');
    await analyzer.syncWorkspacePlugins();
    setPluginActivation(workspaceFixture.workspacePath, installedPackage.pluginId, 'enabled');
    await analyzer.syncWorkspacePlugins();

    const refreshedGraph = await analyzer.refreshPluginFiles([installedPackage.pluginId]);
    expect(hasPluginEdge(refreshedGraph, installedPackage.pluginId)).toBe(true);
  });
});

function setPluginActivation(
  workspaceRoot: string,
  pluginId: string,
  activation: 'disabled' | 'enabled',
): void {
  const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
  writeCodeGraphyWorkspaceSettings(workspaceRoot, {
    ...settings,
    plugins: settings.plugins.map(plugin => (
      plugin.id === pluginId ? { ...plugin, activation } : plugin
    )),
  });
}

function hasPluginEdge(
  graph: Awaited<ReturnType<WorkspacePipeline['refreshIndex']>>,
  pluginId: string,
): boolean {
  return graph.edges.some(edge => edge.sources.some(source => source.pluginId === pluginId));
}
