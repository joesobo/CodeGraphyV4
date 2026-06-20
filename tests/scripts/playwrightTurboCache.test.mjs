import assert from 'node:assert/strict';
import test from 'node:test';

import {
  computePlaywrightTurboCacheHash,
  isPlaywrightTurboCacheHit,
} from '../../scripts/playwright-turbo-cache.mjs';

test('uses the Turbo task hash as the Playwright cache hash for one package', () => {
  assert.equal(
    computePlaywrightTurboCacheHash({
      tasks: [
        {
          task: 'test:playwright',
          taskId: '@codegraphy-dev/extension#test:playwright',
          hash: 'abc123',
          cache: { status: 'MISS' },
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
        cache: { status: 'MISS' },
      },
      {
        task: 'test:playwright',
        taskId: '@codegraphy-dev/first#test:playwright',
        hash: 'first',
        cache: { status: 'MISS' },
      },
    ],
  };

  assert.equal(computePlaywrightTurboCacheHash(dryRun).length, 32);
  assert.equal(
    computePlaywrightTurboCacheHash(dryRun),
    computePlaywrightTurboCacheHash({ tasks: [...dryRun.tasks].reverse() }),
  );
});

test('reports a Playwright Turbo hit only when every Playwright task hits', () => {
  assert.equal(
    isPlaywrightTurboCacheHit({
      tasks: [
        {
          task: 'test:playwright',
          taskId: '@codegraphy-dev/extension#test:playwright',
          cache: { status: 'HIT' },
        },
      ],
    }),
    true,
  );

  assert.equal(
    isPlaywrightTurboCacheHit({
      tasks: [
        {
          task: 'test:playwright',
          taskId: '@codegraphy-dev/extension#test:playwright',
          cache: { status: 'MISS' },
        },
      ],
    }),
    false,
  );
});
