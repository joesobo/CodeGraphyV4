import { describe, expect, it } from 'vitest';
import { loadQualityConfig } from '../../src/config/qualityConfig';
import {
  createQualityConfigMissingRepo,
  createQualityConfigRepo,
  DEFAULT_QUALITY_CONFIG
} from './qualityConfigRepo';

describe('loadQualityConfig', () => {
  it('returns an empty config when the file is missing', () => {
    expect(loadQualityConfig(createQualityConfigMissingRepo())).toEqual({});
  });

  it('loads the repo quality config', () => {
    expect(loadQualityConfig(createQualityConfigRepo(DEFAULT_QUALITY_CONFIG))).toMatchObject({
      defaults: {
        mutation: {
          include: ['src/**/*.ts']
        }
      }
    });
  });
});
