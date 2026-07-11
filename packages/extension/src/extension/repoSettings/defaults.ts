import { DEFAULT_DIRECTION_COLOR } from '../../shared/fileColors';
import type { IGroup } from '../../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../../shared/settings/modes';
import { DEFAULT_MAX_FILES } from '../../shared/settings/defaults';
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
  version: 1;
  maxFiles: number;
  verboseDiagnostics: boolean;
  include: string[];
  respectGitignore: boolean;
  respectFilesExclude: boolean;
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
  dagMode: DagMode;
  nodeSizeMode: NodeSizeMode;
  physics: {
    repelForce: number;
    linkDistance: number;
    linkForce: number;
    damping: number;
    centerForce: number;
    chargeRange: number;
  };
  timeline: {
    maxCommits: number;
    playbackSpeed: number;
  };
}

export function createDefaultCodeGraphyRepoSettings(): ICodeGraphyRepoSettings {
  return {
    version: 1,
    maxFiles: DEFAULT_MAX_FILES,
    verboseDiagnostics: false,
    include: ['**/*'],
    respectGitignore: true,
    respectFilesExclude: true,
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
    dagMode: null,
    nodeSizeMode: 'connections',
    physics: {
      repelForce: 10,
      linkDistance: 80,
      linkForce: 0.15,
      damping: 0.7,
      centerForce: 0.1,
      chargeRange: 200,
    },
    timeline: {
      maxCommits: 500,
      playbackSpeed: 1,
    },
  };
}
