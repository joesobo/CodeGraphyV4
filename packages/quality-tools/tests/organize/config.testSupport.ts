import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const DEFAULT_ORGANIZE_CONFIG = {
  defaults: {
    organize: {
      lowInfoNames: {
        banned: ['utils', 'helpers', 'misc', 'common', 'shared', '_shared', 'lib', 'index'],
        discouraged: ['types', 'constants', 'config', 'base', 'core']
      },
      fileFanOut: { warning: 8, split: 10 },
      folderFanOut: { warning: 10, split: 13 },
      depth: { warning: 4, deep: 5 },
      redundancyThreshold: 0.3,
      cohesionClusterMinSize: 3
    }
  }
} as const;

export function createOrganizeConfigRepo(config: unknown, prefix = 'organize-config-'): string {
  const repoRoot = mkdtempSync(join(tmpdir(), prefix));
  writeFileSync(join(repoRoot, 'quality.config.json'), JSON.stringify(config));
  return repoRoot;
}

export function createOrganizeConfigMissingRepo(prefix = 'organize-config-missing-'): string {
  return mkdtempSync(join(tmpdir(), prefix));
}
