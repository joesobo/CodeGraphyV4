import { DEFAULT_DIRECTION_COLOR } from '../../shared/fileColors';
import type { IGroup } from '../../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../../shared/settings/modes';
import {
  createDefaultEdgeColors,
  createDefaultEdgeVisibility,
  createDefaultNodeColors,
  createDefaultNodeVisibility,
} from '../../shared/graphControls/defaults';

export interface ICodeGraphyRepoSettings {
  version: 1;
  maxFiles: number;
  include: string[];
  respectGitignore: boolean;
  showOrphans: boolean;
  plugins: string[];
  pluginOrder: string[];
  disabledPlugins: string[];
  nodeColors: Record<string, string>;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
  edgeColors: Record<string, string>;
  favorites: string[];
  bidirectionalEdges: 'separate' | 'combined';
  legend: IGroup[];
  filterPatterns: string[];
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

export interface LegacyCodeGraphyConfigurationLike {
  get<T>(key: string, defaultValue: T): T;
}

export function createDefaultCodeGraphyRepoSettings(): ICodeGraphyRepoSettings {
  return {
    version: 1,
    maxFiles: 500,
    include: ['**/*'],
    respectGitignore: true,
    showOrphans: true,
    plugins: [],
    pluginOrder: [],
    disabledPlugins: [],
    nodeColors: createDefaultNodeColors(),
    nodeVisibility: createDefaultNodeVisibility(),
    edgeVisibility: createDefaultEdgeVisibility(),
    edgeColors: createDefaultEdgeColors(),
    favorites: [],
    bidirectionalEdges: 'separate',
    legend: [],
    filterPatterns: [],
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

export function createCodeGraphyRepoSettingsFromLegacyConfig(
  legacyConfig?: LegacyCodeGraphyConfigurationLike,
): ICodeGraphyRepoSettings {
  const defaults = createDefaultCodeGraphyRepoSettings();
  if (!legacyConfig) {
    return defaults;
  }

  const legacyFilterPatterns = legacyConfig.get<string[]>('filterPatterns', []);
  const legacyExcludePatterns = legacyConfig.get<string[]>('exclude', []);
  const filterPatterns = Array.from(
    new Set([...legacyFilterPatterns, ...legacyExcludePatterns]),
  );

  return {
    version: 1,
    maxFiles: legacyConfig.get<number>('maxFiles', defaults.maxFiles),
    include: legacyConfig.get<string[]>('include', defaults.include),
    respectGitignore: legacyConfig.get<boolean>('respectGitignore', defaults.respectGitignore),
    showOrphans: legacyConfig.get<boolean>('showOrphans', defaults.showOrphans),
    plugins: legacyConfig.get<string[]>('plugins', defaults.plugins),
    pluginOrder: defaults.pluginOrder,
    disabledPlugins: legacyConfig.get<string[]>('disabledPlugins', defaults.disabledPlugins),
    nodeColors: {
      ...defaults.nodeColors,
      folder: legacyConfig.get<string>('folderNodeColor', defaults.nodeColors.folder),
    },
    nodeVisibility: defaults.nodeVisibility,
    edgeVisibility: defaults.edgeVisibility,
    edgeColors: defaults.edgeColors,
    favorites: legacyConfig.get<string[]>('favorites', defaults.favorites),
    bidirectionalEdges: legacyConfig.get<'separate' | 'combined'>(
      'bidirectionalEdges',
      defaults.bidirectionalEdges,
    ),
    legend: legacyConfig.get<IGroup[]>('groups', defaults.legend),
    filterPatterns,
    showLabels: legacyConfig.get<boolean>('showLabels', defaults.showLabels),
    directionMode: legacyConfig.get<'arrows' | 'particles' | 'none'>(
      'directionMode',
      defaults.directionMode,
    ),
    directionColor: legacyConfig.get<string>('directionColor', defaults.directionColor),
    particleSpeed: legacyConfig.get<number>('particleSpeed', defaults.particleSpeed),
    particleSize: legacyConfig.get<number>('particleSize', defaults.particleSize),
    depthMode: legacyConfig.get<boolean>('depthMode', defaults.depthMode),
    depthLimit: legacyConfig.get<number>('depthLimit', defaults.depthLimit),
    dagMode: legacyConfig.get<DagMode>('dagMode', defaults.dagMode),
    nodeSizeMode: legacyConfig.get<NodeSizeMode>('nodeSizeMode', defaults.nodeSizeMode),
    physics: {
      repelForce: legacyConfig.get<number>('physics.repelForce', defaults.physics.repelForce),
      linkDistance: legacyConfig.get<number>('physics.linkDistance', defaults.physics.linkDistance),
      linkForce: legacyConfig.get<number>('physics.linkForce', defaults.physics.linkForce),
      damping: legacyConfig.get<number>('physics.damping', defaults.physics.damping),
      centerForce: legacyConfig.get<number>('physics.centerForce', defaults.physics.centerForce),
      chargeRange: legacyConfig.get<number>('physics.chargeRange', defaults.physics.chargeRange),
    },
    timeline: {
      maxCommits: legacyConfig.get<number>('timeline.maxCommits', defaults.timeline.maxCommits),
      playbackSpeed: legacyConfig.get<number>(
        'timeline.playbackSpeed',
        defaults.timeline.playbackSpeed,
      ),
    },
  };
}
