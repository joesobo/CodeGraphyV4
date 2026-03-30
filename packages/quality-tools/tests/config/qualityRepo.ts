import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const DEFAULT_QUALITY_CONFIG = {
  defaults: {
    mutation: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', '**/index.ts']
    },
    crap: {
      exclude: ['**/*.test.ts', 'src/generated/**']
    },
    scrap: {
      include: ['tests/**/*.test.ts'],
      exclude: ['tests/helpers/**']
    }
  },
  packages: {
    example: {
      mutation: {
        exclude: ['src/ignored.ts']
      },
      scrap: {
        exclude: ['tests/legacy/**']
      }
    }
  }
} as const;

export const OVERRIDE_ONLY_QUALITY_CONFIG = {
  packages: {
    example: {
      mutation: {
        exclude: ['src/ignored.ts']
      }
    }
  }
} as const;

export function createQualityConfigRepo(config: unknown, prefix = 'quality-tools-config-'): string {
  const repoRoot = mkdtempSync(join(tmpdir(), prefix));
  writeFileSync(join(repoRoot, 'quality.config.json'), JSON.stringify(config));
  return repoRoot;
}

export function createQualityConfigMissingRepo(): string {
  return mkdtempSync(join(tmpdir(), 'quality-tools-config-missing-'));
}
