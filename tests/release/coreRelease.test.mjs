import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCoreReleaseManifest,
  collectCoreReleaseEntries,
  prepareCoreReleaseBase,
} from '../../scripts/release-core.mjs';

test('buildCoreReleaseManifest uses the extension package version for core releases', () => {
  const manifest = buildCoreReleaseManifest(
    {
      name: 'codegraphy',
      version: '1.0.0',
      packageManager: 'pnpm@10.32.0',
      workspaces: ['packages/*'],
      scripts: {
        build: 'turbo run build',
        package: 'vsce package',
      },
      displayName: 'CodeGraphy',
      publisher: 'codegraphy',
      main: './dist/extension.js',
      files: ['dist/**', 'assets/**', 'README.md'],
    },
    {
      version: '4.0.2',
    },
  );

  assert.equal(manifest.version, '4.0.2');
  assert.equal(manifest.name, 'codegraphy');
  assert.equal(manifest.displayName, 'CodeGraphy');
  assert.ok(!('packageManager' in manifest));
  assert.ok(!('workspaces' in manifest));
  assert.ok(!('scripts' in manifest));
});

test('collectCoreReleaseEntries collapses packaged directories and preserves explicit files', () => {
  const entries = collectCoreReleaseEntries({
    files: [
      'dist/**',
      'assets/**',
      'docs/**',
      'packages/plugin-markdown/codegraphy.json',
      'README.md',
    ],
  });

  assert.deepEqual(entries, [
    'dist',
    'assets',
    'docs',
    'packages/plugin-markdown/codegraphy.json',
    'README.md',
  ]);
});

test('prepareCoreReleaseBase rebuilds the extension bundle before staging a core release', () => {
  const calls = [];

  prepareCoreReleaseBase('/repo/codegraphy', (command, args, options = {}) => {
    calls.push({ command, args, options });
  });

  assert.deepEqual(calls, [
    {
      command: 'pnpm',
      args: ['--filter', '@codegraphy/extension', 'run', 'build'],
      options: { cwd: '/repo/codegraphy' },
    },
  ]);
});
