import { describe, expect, it } from 'vitest';
import { readWorkspacePipelineUserHomeDir } from '../../../../src/extension/pipeline/service/userHome';

describe('readWorkspacePipelineUserHomeDir', () => {
  it('uses CODEGRAPHY_HOME for workspace package plugin cache lookup', () => {
    expect(readWorkspacePipelineUserHomeDir({
      CODEGRAPHY_HOME: '/tmp/codegraphy-home',
    })).toBe('/tmp/codegraphy-home');
  });

  it('ignores an empty CODEGRAPHY_HOME value', () => {
    expect(readWorkspacePipelineUserHomeDir({
      CODEGRAPHY_HOME: '   ',
    })).toBeUndefined();
  });
});
