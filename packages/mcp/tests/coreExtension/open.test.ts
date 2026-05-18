import { describe, expect, it } from 'vitest';

import { requestCodeGraphyOpenRepo } from '../../src/coreExtension/open';

describe('coreExtension/open', () => {
  it('points legacy open users at the path-first index command when the Graph Cache is missing', () => {
    const result = requestCodeGraphyOpenRepo({
      repoPath: '/workspace/project',
    }, {
      graphCacheExists: () => false,
      runCommand: () => ({ status: 0 }),
    });

    expect(result).toMatchObject({
      message: 'Graph Cache has not been created yet. Run `codegraphy index /workspace/project` before querying.',
    });
  });
});
