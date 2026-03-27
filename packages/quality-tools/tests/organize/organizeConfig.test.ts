import { describe, expect, it } from 'vitest';
import { loadOrganizeConfig } from '../../src/organize/organizeConfig';
import {
  createOrganizeConfigMissingRepo,
  createOrganizeConfigRepo,
  DEFAULT_ORGANIZE_CONFIG
} from './organizeConfig.testSupport';

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
      organize: {
        fileFanOut: { warning: 5, split: 8 },
        redundancyThreshold: 0.5
      }
    };
    const result = loadOrganizeConfig(createOrganizeConfigRepo(customConfig));

    expect(result.fileFanOut).toEqual({ warning: 5, split: 8 });
    expect(result.redundancyThreshold).toBe(0.5);
  });

  it('merges custom overrides with default values', () => {
    const result = loadOrganizeConfig(createOrganizeConfigRepo(DEFAULT_ORGANIZE_CONFIG));

    expect(result.lowInfoNames.banned).toEqual(DEFAULT_ORGANIZE_CONFIG.organize.lowInfoNames.banned);
    expect(result.fileFanOut).toEqual(DEFAULT_ORGANIZE_CONFIG.organize.fileFanOut);
    expect(result.depth).toEqual(DEFAULT_ORGANIZE_CONFIG.organize.depth);
  });
});
