import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  createWorkspacePluginDataHost,
  getWorkspaceSettingsPath,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyWorkspaceSettings,
} from '../../../src';

async function createWorkspace(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-plugin-data-'));
}

describe('Workspace plugin data host', () => {
  it('loads fallback data without writing settings before a plugin saves data', async () => {
    const workspaceRoot = await createWorkspace();
    const host = createWorkspacePluginDataHost(workspaceRoot, 'acme.workspace-notes');

    expect(host.loadData({ notes: [] })).toEqual({ notes: [] });
    await expect(fs.access(getWorkspaceSettingsPath(workspaceRoot))).rejects.toThrow();
  });

  it('saves and reloads plugin-owned data under plugin id while preserving workspace plugin settings', async () => {
    const workspaceRoot = await createWorkspace();
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
        enabled: true,
      }],
    });

    const host = createWorkspacePluginDataHost(workspaceRoot, 'acme.workspace-notes');
    await host.saveData({ notes: ['frontend'] }, { undoLabel: 'Save plugin data' });

    expect(createWorkspacePluginDataHost(workspaceRoot, 'acme.workspace-notes').loadData({
      notes: [],
    })).toEqual({
      notes: ['frontend'],
    });
    expect(JSON.parse(
      await fs.readFile(getWorkspaceSettingsPath(workspaceRoot), 'utf-8'),
    )).toMatchObject({
      plugins: [{
        id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
        enabled: true,
      }],
      pluginData: {
        'acme.workspace-notes': {
          notes: ['frontend'],
        },
      },
    });
  });

  it('preserves extension-owned workspace settings when plugin data is saved', async () => {
    const workspaceRoot = await createWorkspace();
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
        enabled: true,
      }],
    });
    const settingsPath = getWorkspaceSettingsPath(workspaceRoot);
    const initialSettings = {
      ...JSON.parse(await fs.readFile(settingsPath, 'utf-8')) as Record<string, unknown>,
      nodeColors: {
        file: '#A1A1AA',
        'plugin:codegraphy.gdscript:symbol:godot-class-name': '#478CBF',
      },
      nodeVisibility: {
        file: true,
        'plugin:codegraphy.gdscript:symbol:godot-class-name': false,
      },
      edgeVisibility: {
        import: true,
        typeImport: false,
      },
      bidirectionalEdges: 'separate',
      legend: [],
      legendVisibility: {},
      legendOrder: [],
      showLabels: true,
      directionMode: 'arrows',
      directionColor: '#475569',
      particleSpeed: 0.005,
      particleSize: 4,
      depthMode: false,
      depthLimit: 1,
      nodeSizeMode: 'connections',
      physics: {
        repelForce: 13,
        linkDistance: 80,
        linkForce: 0.95,
        damping: 0.7,
        centerForce: 0.16,
        chargeRange: 200,
      },
    };
    await fs.writeFile(settingsPath, `${JSON.stringify(initialSettings, null, 2)}\n`, 'utf-8');

    const host = createWorkspacePluginDataHost(workspaceRoot, 'codegraphy.organize');
    await host.saveData({
      sections: {
        'section-1': {
          id: 'section-1',
          label: 'Section 1',
        },
      },
    });

    const persisted = JSON.parse(await fs.readFile(settingsPath, 'utf-8')) as Record<string, unknown>;
    expect(persisted).toMatchObject({
      nodeColors: initialSettings.nodeColors,
      nodeVisibility: initialSettings.nodeVisibility,
      edgeVisibility: initialSettings.edgeVisibility,
      bidirectionalEdges: 'separate',
      showLabels: true,
      directionMode: 'arrows',
      physics: initialSettings.physics,
      pluginData: {
        'codegraphy.organize': {
          sections: {
            'section-1': {
              id: 'section-1',
              label: 'Section 1',
            },
          },
        },
      },
    });
  });
});
