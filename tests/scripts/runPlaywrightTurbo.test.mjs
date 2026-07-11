import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildTurboArgs,
  selectPlaywrightPackagesForEnvironment,
  splitScriptArgs,
} from '../../scripts/run-playwright-turbo.mjs';

test('limits VS Code Playwright shards to the extension package', () => {
  const packages = ['@codegraphy-dev/extension', '@codegraphy-dev/graph-benchmark'];
  assert.deepEqual(
    selectPlaywrightPackagesForEnvironment(packages, {
      CODEGRAPHY_VSCODE_PLAYWRIGHT_SUITE: 'interactions-hover-selection',
    }),
    ['@codegraphy-dev/extension'],
  );
  assert.deepEqual(selectPlaywrightPackagesForEnvironment(packages, {}), packages);
});

test('builds a filtered turbo command for Playwright-owning packages', () => {
  assert.deepEqual(
    buildTurboArgs({
      packageNames: ['@codegraphy-dev/extension'],
      turboArgs: [],
      passthroughArgs: [],
    }),
    [
      'exec',
      'turbo',
      'run',
      'test:playwright',
      '--filter=@codegraphy-dev/extension',
    ],
  );
});

test('passes Playwright args after the turbo passthrough delimiter', () => {
  assert.deepEqual(
    buildTurboArgs({
      packageNames: ['@codegraphy-dev/extension'],
      turboArgs: ['--dry=json'],
      passthroughArgs: ['--shard=1/2'],
    }),
    [
      'exec',
      'turbo',
      'run',
      'test:playwright',
      '--filter=@codegraphy-dev/extension',
      '--dry=json',
      '--',
      '--shard=1/2',
    ],
  );
});

test('splits turbo args from Playwright passthrough args', () => {
  assert.deepEqual(
    splitScriptArgs(['--dry=json', '--', '--shard=2/2']),
    {
      turboArgs: ['--dry=json'],
      passthroughArgs: ['--shard=2/2'],
    },
  );
});
