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
  type CodeGraphyWorkspacePluginSettings,
} from '@codegraphy-dev/core';
import {
  createDefaultEdgeVisibility,
  createDefaultNodeColors,
  createDefaultNodeVisibility,
} from '../../shared/graphControls/defaults/maps';

export interface ICodeGraphyRepoSettings {
  version: 2;
  maxFiles: number;
  showFps: boolean;
  showMinimap: boolean;
  verboseDiagnostics: boolean;
  include: string[];
  respectGitignore: boolean;
  showOrphans: boolean;
  cssSnippets: Record<string, boolean>;
  plugins: CodeGraphyWorkspacePluginSettings[];
  pluginData: Record<string, unknown>;
  nodeColors: Record<string, string>;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
  favorites: string[];
  bidirectionalEdges: 'separate' | 'combined';
  legend: IGroup[];
  legendVisibility: Record<string, boolean>;
  legendOrder: string[];
  filterPatterns: string[];
  disabledCustomFilterPatterns: string[];
  disabledPluginFilterPatterns: string[];
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

export function createDefaultCodeGraphyRepoSettings(): ICodeGraphyRepoSettings {
  return {
    version: 2,
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
      enabled: true,
    }],
    pluginData: {},
    nodeColors: createDefaultNodeColors(),
    nodeVisibility: createDefaultNodeVisibility(),
    edgeVisibility: createDefaultEdgeVisibility(),
    favorites: [],
    bidirectionalEdges: 'separate',
    legend: [],
    legendVisibility: {},
    legendOrder: [],
    filterPatterns: [],
    disabledCustomFilterPatterns: [],
    disabledPluginFilterPatterns: [],
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
