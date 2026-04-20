import { DEFAULT_DIRECTION_COLOR } from '../../shared/fileColors';
import type { IGroup } from '../../shared/settings/groups';
import type { DagMode, NodeSizeMode } from '../../shared/settings/modes';
import {
  createDefaultEdgeVisibility,
  createDefaultNodeColors,
  createDefaultNodeVisibility,
} from '../../shared/graphControls/defaults/maps';

export interface ICodeGraphyRepoSettings {
  version: 1;
  maxFiles: number;
  include: string[];
  respectGitignore: boolean;
  showOrphans: boolean;
  pluginOrder: string[];
  disabledPlugins: string[];
  nodeColors: Record<string, string>;
  nodeVisibility: Record<string, boolean>;
  edgeVisibility: Record<string, boolean>;
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

export function createDefaultCodeGraphyRepoSettings(): ICodeGraphyRepoSettings {
  return {
    version: 1,
    maxFiles: 500,
    include: ['**/*'],
    respectGitignore: true,
    showOrphans: true,
    pluginOrder: [],
    disabledPlugins: [],
    nodeColors: createDefaultNodeColors(),
    nodeVisibility: createDefaultNodeVisibility(),
    edgeVisibility: createDefaultEdgeVisibility(),
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
