import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computePlaywrightTurboCacheHash,
} from '../../scripts/playwright-turbo-cache.mjs';

test('uses the Turbo task hash as the Playwright cache hash for one package', () => {
  assert.equal(
    computePlaywrightTurboCacheHash({
      tasks: [
        {
          task: 'test:playwright',
          taskId: '@codegraphy-dev/extension#test:playwright',
          hash: 'abc123',
        },
      ],
    }),
    'abc123',
  );
});

test('combines multiple Playwright task hashes into a stable cache hash', () => {
  const dryRun = {
    tasks: [
      {
        task: 'test:playwright',
        taskId: '@codegraphy-dev/second#test:playwright',
        hash: 'second',
      },
      {
        task: 'test:playwright',
        taskId: '@codegraphy-dev/first#test:playwright',
        hash: 'first',
      },
    ],
  };

  assert.equal(computePlaywrightTurboCacheHash(dryRun).length, 32);
  assert.equal(
    computePlaywrightTurboCacheHash(dryRun),
    computePlaywrightTurboCacheHash({ tasks: [...dryRun.tasks].reverse() }),
  );
});
