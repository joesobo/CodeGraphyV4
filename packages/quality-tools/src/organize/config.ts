import { readFileSync } from 'fs';
import { join } from 'path';

export interface OrganizeLowInfoNames {
  banned: string[];
  discouraged: string[];
}

export interface OrganizeFanOutThresholds {
  warning: number;
  split: number;
}

export interface OrganizeDepthThresholds {
  warning: number;
  deep: number;
}

export interface OrganizeConfigBlock {
  lowInfoNames?: OrganizeLowInfoNames;
  fileFanOut?: OrganizeFanOutThresholds;
  folderFanOut?: OrganizeFanOutThresholds;
  depth?: OrganizeDepthThresholds;
  redundancyThreshold?: number;
  cohesionClusterMinSize?: number;
}

export interface ResolvedOrganizeConfig {
  lowInfoNames: OrganizeLowInfoNames;
  fileFanOut: OrganizeFanOutThresholds;
  folderFanOut: OrganizeFanOutThresholds;
  depth: OrganizeDepthThresholds;
  redundancyThreshold: number;
  cohesionClusterMinSize: number;
}

const DEFAULT_CONFIG: ResolvedOrganizeConfig = {
  lowInfoNames: {
    banned: ['utils', 'helpers', 'misc', 'common', 'shared', '_shared', 'lib', 'index'],
    discouraged: ['types', 'constants', 'config', 'base', 'core']
  },
  fileFanOut: { warning: 8, split: 10 },
  folderFanOut: { warning: 10, split: 13 },
  depth: { warning: 4, deep: 5 },
  redundancyThreshold: 0.3,
  cohesionClusterMinSize: 3
};

const CONFIG_FILE = 'quality.config.json';

interface QualityConfig {
  defaults?: {
    organize?: OrganizeConfigBlock;
  };
  packages?: Record<string, {
    organize?: OrganizeConfigBlock;
  }>;
}

function mergeConfig(defaults: ResolvedOrganizeConfig, overrides: OrganizeConfigBlock): ResolvedOrganizeConfig {
  return {
    lowInfoNames: overrides.lowInfoNames ?? defaults.lowInfoNames,
    fileFanOut: overrides.fileFanOut ?? defaults.fileFanOut,
    folderFanOut: overrides.folderFanOut ?? defaults.folderFanOut,
    depth: overrides.depth ?? defaults.depth,
    redundancyThreshold: overrides.redundancyThreshold ?? defaults.redundancyThreshold,
    cohesionClusterMinSize: overrides.cohesionClusterMinSize ?? defaults.cohesionClusterMinSize
  };
}

export function loadOrganizeConfig(repoRoot: string, packageName?: string): ResolvedOrganizeConfig {
  const configPath = join(repoRoot, CONFIG_FILE);

  try {
    const rawConfig = JSON.parse(readFileSync(configPath, 'utf-8')) as QualityConfig;
    const defaultConfig = rawConfig.defaults?.organize;
    const packageConfig = packageName ? rawConfig.packages?.[packageName]?.organize : undefined;

    if (defaultConfig || packageConfig) {
      const mergedDefaults = defaultConfig ? mergeConfig(DEFAULT_CONFIG, defaultConfig) : DEFAULT_CONFIG;
      return packageConfig ? mergeConfig(mergedDefaults, packageConfig) : mergedDefaults;
    }
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}
