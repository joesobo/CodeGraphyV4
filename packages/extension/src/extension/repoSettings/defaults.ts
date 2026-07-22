import { DEFAULT_DIRECTION_COLOR } from '../../shared/fileColors';
import type { IGroup } from '../../shared/settings/groups';
import type { NodeSizeMode } from '../../shared/settings/modes';
import { DEFAULT_MAX_FILES, DEFAULT_SHOW_MINIMAP } from '../../shared/settings/defaults';
import {
  DEFAULT_PHYSICS_SETTINGS,
  type IPhysicsSettings,
} from '../../shared/settings/physics';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  type CodeGraphyWorkspaceInterfaceSettings,
  type CodeGraphyWorkspacePluginSettings,
} from '@codegraphy-dev/core';
import {
  createDefaultEdgeVisibility,
  createDefaultNodeColors,
  createDefaultNodeVisibility,
} from '../../shared/graphControls/defaults/maps';

export const CODEGRAPHY_EXTENSION_INTERFACE_ID = 'codegraphy.extension';

export interface ICodeGraphyExtensionInterfaceSettings {
  nodeColors: Record<string, string>;
  favorites: string[];
  bidirectionalEdges: 'separate' | 'combined';
  legend: IGroup[];
  legendVisibility: Record<string, boolean>;
  legendOrder: string[];
  showLabels: boolean;
  directionMode: 'arrows' | 'particles' | 'none';
  directionColor: string;
  particleSpeed: number;
  particleSize: number;
  depthMode: boolean;
  depthLimit: number;
  nodeSizeMode: NodeSizeMode;
  physics: IPhysicsSettings;
}

export const CODEGRAPHY_EXTENSION_INTERFACE_SETTING_KEYS = [
  'nodeColors',
  'favorites',
  'bidirectionalEdges',
  'legend',
  'legendVisibility',
  'legendOrder',
  'showLabels',
  'directionMode',
  'directionColor',
  'particleSpeed',
  'particleSize',
  'depthMode',
  'depthLimit',
  'nodeSizeMode',
  'physics',
] satisfies readonly (keyof ICodeGraphyExtensionInterfaceSettings)[];

export interface ICodeGraphyRepoSettings extends ICodeGraphyExtensionInterfaceSettings {
  version: 3;
  maxFiles: number;
  showFps: boolean;
  showMinimap: boolean;
  verboseDiagnostics: boolean;
  include: string[];
  respectGitignore: boolean;
  showOrphans: boolean;
  cssSnippets: Record<string, boolean>;
  plugins: CodeGraphyWorkspacePluginSettings[];
  interfaces: CodeGraphyWorkspaceInterfaceSettings[];
  pluginData: Record<string, unknown>;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
  filterPatterns: string[];
  disabledCustomFilterPatterns: string[];
  disabledPluginFilterPatterns: string[];
}

function createDefaultExtensionInterfaceSettings(): ICodeGraphyExtensionInterfaceSettings {
  return {
    nodeColors: createDefaultNodeColors(),
    favorites: [],
    bidirectionalEdges: 'separate',
    legend: [],
    legendVisibility: {},
    legendOrder: [],
    showLabels: true,
    directionMode: 'arrows',
    directionColor: DEFAULT_DIRECTION_COLOR,
    particleSpeed: 0.005,
    particleSize: 4,
    depthMode: false,
    depthLimit: 1,
    nodeSizeMode: 'connections',
    physics: { ...DEFAULT_PHYSICS_SETTINGS },
  };
}

export function createDefaultCodeGraphyRepoSettings(): ICodeGraphyRepoSettings {
  const extensionSettings = createDefaultExtensionInterfaceSettings();

  return {
    version: 3,
    maxFiles: DEFAULT_MAX_FILES,
    showFps: false,
    showMinimap: DEFAULT_SHOW_MINIMAP,
    verboseDiagnostics: false,
    include: ['**/*'],
    respectGitignore: true,
    showOrphans: true,
    cssSnippets: {},
    plugins: [{
      id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
      activation: 'enabled',
    }],
    interfaces: [{
      id: CODEGRAPHY_EXTENSION_INTERFACE_ID,
      data: createDefaultExtensionInterfaceSettings(),
    }],
    pluginData: {},
    nodeVisibility: createDefaultNodeVisibility(),
    edgeVisibility: createDefaultEdgeVisibility(),
    filterPatterns: [],
    disabledCustomFilterPatterns: [],
    disabledPluginFilterPatterns: [],
    ...extensionSettings,
  };
}
