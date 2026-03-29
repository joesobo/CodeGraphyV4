import { describe, expect, it } from 'vitest';
import { loadOrganizeConfig } from '../../src/organize/config';
import {
  createOrganizeConfigMissingRepo,
  createOrganizeConfigRepo,
  DEFAULT_ORGANIZE_CONFIG
} from './config.testSupport';

describe('loadOrganizeConfig', () => {
  it('returns default config when the file is missing', () => {
    const result = loadOrganizeConfig(createOrganizeConfigMissingRepo());

    expect(result.lowInfoNames.banned).toContain('utils');
    expect(result.fileFanOut).toEqual({ warning: 8, split: 10 });
    expect(result.folderFanOut).toEqual({ warning: 10, split: 13 });
    expect(result.depth).toEqual({ warning: 4, deep: 5 });
    expect(result.redundancyThreshold).toBe(0.3);
    expect(result.cohesionClusterMinSize).toBe(3);
  });

  it('loads custom organize config from quality.config.json', () => {
    const customConfig = {
      defaults: {
        organize: {
          fileFanOut: { warning: 5, split: 8 },
          redundancyThreshold: 0.5
        }
      }
    };
    const result = loadOrganizeConfig(createOrganizeConfigRepo(customConfig));

    expect(result.fileFanOut).toEqual({ warning: 5, split: 8 });
    expect(result.redundancyThreshold).toBe(0.5);
  });

  it('merges custom overrides with default values', () => {
    const result = loadOrganizeConfig(createOrganizeConfigRepo(DEFAULT_ORGANIZE_CONFIG));

    expect(result.lowInfoNames.banned).toEqual(DEFAULT_ORGANIZE_CONFIG.defaults.organize.lowInfoNames.banned);
    expect(result.fileFanOut).toEqual(DEFAULT_ORGANIZE_CONFIG.defaults.organize.fileFanOut);
    expect(result.depth).toEqual(DEFAULT_ORGANIZE_CONFIG.defaults.organize.depth);
  });

  it('preserves default lowInfoNames when only other fields are overridden', () => {
    const customConfig = {
      defaults: {
        organize: {
          fileFanOut: { warning: 6, split: 9 }
        }
      }
    };
    const result = loadOrganizeConfig(createOrganizeConfigRepo(customConfig));

    expect(result.lowInfoNames.banned).toContain('utils');
    expect(result.lowInfoNames.banned).toContain('helpers');
    expect(result.fileFanOut).toEqual({ warning: 6, split: 9 });
  });

  it('preserves default folderFanOut when only other fields are overridden', () => {
    const customConfig = {
      defaults: {
        organize: {
          fileFanOut: { warning: 7, split: 11 }
        }
      }
    };
    const result = loadOrganizeConfig(createOrganizeConfigRepo(customConfig));

    expect(result.folderFanOut).toEqual({ warning: 10, split: 13 });
    expect(result.fileFanOut).toEqual({ warning: 7, split: 11 });
  });

  it('preserves default depth when only other fields are overridden', () => {
    const customConfig = {
      defaults: {
        organize: {
          redundancyThreshold: 0.4
        }
      }
    };
    const result = loadOrganizeConfig(createOrganizeConfigRepo(customConfig));

    expect(result.depth).toEqual({ warning: 4, deep: 5 });
    expect(result.redundancyThreshold).toBe(0.4);
  });

  it('preserves default cohesionClusterMinSize when only other fields are overridden', () => {
    const customConfig = {
      defaults: {
        organize: {
          fileFanOut: { warning: 5, split: 8 },
          folderFanOut: { warning: 11, split: 14 }
        }
      }
    };
    const result = loadOrganizeConfig(createOrganizeConfigRepo(customConfig));

    expect(result.cohesionClusterMinSize).toBe(3);
    expect(result.fileFanOut).toEqual({ warning: 5, split: 8 });
    expect(result.folderFanOut).toEqual({ warning: 11, split: 14 });
  });

  it('overrides all fields when all are specified', () => {
    const customConfig = {
      defaults: {
        organize: {
          lowInfoNames: { banned: ['custom'], discouraged: [] },
          fileFanOut: { warning: 4, split: 6 },
          folderFanOut: { warning: 5, split: 7 },
          depth: { warning: 2, deep: 3 },
          redundancyThreshold: 0.7,
          cohesionClusterMinSize: 5
        }
      }
    };
    const result = loadOrganizeConfig(createOrganizeConfigRepo(customConfig));

    expect(result.lowInfoNames.banned).toEqual(['custom']);
    expect(result.fileFanOut).toEqual({ warning: 4, split: 6 });
    expect(result.folderFanOut).toEqual({ warning: 5, split: 7 });
    expect(result.depth).toEqual({ warning: 2, deep: 3 });
    expect(result.redundancyThreshold).toBe(0.7);
    expect(result.cohesionClusterMinSize).toBe(5);
  });

  it('applies package-specific organize overrides on top of defaults', () => {
    const customConfig = {
      defaults: {
        organize: {
          fileFanOut: { warning: 8, split: 10 },
          depth: { warning: 4, deep: 5 }
        }
      },
      packages: {
        extension: {
          organize: {
            depth: { warning: 5, deep: 6 }
          }
        }
      }
    };

    const repoRoot = createOrganizeConfigRepo(customConfig);
    const result = loadOrganizeConfig(repoRoot, 'extension');

    expect(result.fileFanOut).toEqual({ warning: 8, split: 10 });
    expect(result.depth).toEqual({ warning: 5, deep: 6 });
  });
});
