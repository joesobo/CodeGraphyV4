import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import * as releaseCore from '../../scripts/release-core.mjs';

test('core extension release declares platform-specific VSIX targets', () => {
  assert.deepEqual(releaseCore.EXTENSION_VSIX_TARGETS, [
    'linux-x64',
    'darwin-arm64',
    'darwin-x64',
    'win32-x64',
  ]);
});

test('package mode creates one target-specific vsce invocation per VSIX target', () => {
  const artifactsDir = path.join('/repo', 'artifacts', 'vsix');

  const invocations = releaseCore.createCoreVsceInvocations({
    mode: 'package',
    version: '5.6.5',
    artifactsDir,
  });

  assert.deepEqual(
    invocations.map(invocation => invocation.args),
    [
      [
        'package',
        '--no-dependencies',
        '--target',
        'linux-x64',
        '--out',
        path.join(artifactsDir, 'codegraphy.codegraphy-5.6.5-linux-x64.vsix'),
      ],
      [
        'package',
        '--no-dependencies',
        '--target',
        'darwin-arm64',
        '--out',
        path.join(artifactsDir, 'codegraphy.codegraphy-5.6.5-darwin-arm64.vsix'),
      ],
      [
        'package',
        '--no-dependencies',
        '--target',
        'darwin-x64',
        '--out',
        path.join(artifactsDir, 'codegraphy.codegraphy-5.6.5-darwin-x64.vsix'),
      ],
      [
        'package',
        '--no-dependencies',
        '--target',
        'win32-x64',
        '--out',
        path.join(artifactsDir, 'codegraphy.codegraphy-5.6.5-win32-x64.vsix'),
      ],
    ],
  );
});

test('publish mode publishes every target-specific VSIX target', () => {
  const invocations = releaseCore.createCoreVsceInvocations({
    mode: 'publish',
    version: '5.6.5',
    artifactsDir: path.join('/repo', 'artifacts', 'vsix'),
  });

  assert.deepEqual(
    invocations.map(invocation => invocation.args),
    [
      ['publish', '--no-dependencies', '--skip-duplicate', '--target', 'linux-x64'],
      ['publish', '--no-dependencies', '--skip-duplicate', '--target', 'darwin-arm64'],
      ['publish', '--no-dependencies', '--skip-duplicate', '--target', 'darwin-x64'],
      ['publish', '--no-dependencies', '--skip-duplicate', '--target', 'win32-x64'],
    ],
  );
});
