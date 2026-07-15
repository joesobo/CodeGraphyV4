import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { collectReleaseTargets, resolveReleaseTargets, runRelease } from '../../scripts/release.mjs';

test('language plugin release targets resolve by short language name', () => {
  const repoRoot = createReleaseFixture({
    'packages/plugin-typescript/package.json': packageManifest('@codegraphy-dev/plugin-typescript'),
    'packages/plugin-svelte/package.json': packageManifest('@codegraphy-dev/plugin-svelte'),
    'packages/plugin-unity/package.json': packageManifest('@codegraphy-dev/plugin-unity'),
    'packages/plugin-vue/package.json': packageManifest('@codegraphy-dev/plugin-vue'),
  });

  assert.deepEqual(resolveReleaseTargets('typescript', repoRoot).map(target => target.packageName), [
    '@codegraphy-dev/plugin-typescript',
  ]);
  assert.deepEqual(resolveReleaseTargets('svelte', repoRoot).map(target => target.packageName), [
    '@codegraphy-dev/plugin-svelte',
  ]);
  assert.deepEqual(resolveReleaseTargets('unity', repoRoot).map(target => target.packageName), [
    '@codegraphy-dev/plugin-unity',
  ]);
  assert.deepEqual(resolveReleaseTargets('vue', repoRoot).map(target => target.packageName), [
    '@codegraphy-dev/plugin-vue',
  ]);
});

test('release target list exposes plugin and short aliases', () => {
  const repoRoot = createReleaseFixture({
    'packages/plugin-svelte/package.json': packageManifest('@codegraphy-dev/plugin-svelte'),
    'packages/plugin-unity/package.json': packageManifest('@codegraphy-dev/plugin-unity'),
    'packages/plugin-vue/package.json': packageManifest('@codegraphy-dev/plugin-vue'),
  });

  const targets = collectReleaseTargets(repoRoot);

  assert.equal(targets.length, 4);
  assert.deepEqual(targets[0], {
    id: 'plugin-svelte',
    aliases: ['plugin-svelte', 'svelte', '@codegraphy-dev/plugin-svelte'],
    kind: 'npm',
    packageName: '@codegraphy-dev/plugin-svelte',
    version: '1.0.0',
    hasBuildScript: true,
    access: 'public',
  });
  assert.deepEqual(targets[1], {
    id: 'plugin-unity',
    aliases: ['plugin-unity', 'unity', '@codegraphy-dev/plugin-unity'],
    kind: 'npm',
    packageName: '@codegraphy-dev/plugin-unity',
    version: '1.0.0',
    hasBuildScript: true,
    access: 'public',
  });
  assert.deepEqual(targets[2], {
    id: 'plugin-vue',
    aliases: ['plugin-vue', 'vue', '@codegraphy-dev/plugin-vue'],
    kind: 'npm',
    packageName: '@codegraphy-dev/plugin-vue',
    version: '1.0.0',
    hasBuildScript: true,
    access: 'public',
  });
  assert.deepEqual(targets[3], {
    id: 'extension',
    aliases: ['extension', 'vsix', 'marketplace', 'core-extension'],
    kind: 'extension',
  });
});

test('already-published workspace dependencies still build before dependent npm targets publish', () => {
  const repoRoot = createReleaseFixture({
    'packages/plugin-api/package.json': packageManifest('@codegraphy-dev/plugin-api', {
      scripts: {},
    }),
    'packages/plugin-markdown/package.json': packageManifest('@codegraphy-dev/plugin-markdown', {
      dependencies: {
        '@codegraphy-dev/plugin-api': 'workspace:*',
      },
    }),
    'packages/core/package.json': packageManifest('@codegraphy-dev/core', {
      dependencies: {
        '@codegraphy-dev/plugin-markdown': 'workspace:*',
      },
    }),
  });
  const commands = [];

  runRelease('publish', 'npm', repoRoot, (command, args) => {
    commands.push([command, ...args]);

    if (command === 'npm' && args[0] === 'view') {
      return { status: args[1] === '@codegraphy-dev/core@1.0.0' ? 1 : 0 };
    }

    return { status: 0 };
  });

  assert.deepEqual(commands.filter(command => command[0] === 'pnpm'), [
    ['pnpm', '--filter', '@codegraphy-dev/plugin-markdown', 'run', 'build'],
    ['pnpm', '--filter', '@codegraphy-dev/core', 'run', 'build'],
    ['pnpm', '--filter', '@codegraphy-dev/core', 'publish', '--access', 'public', '--no-git-checks'],
  ]);
});

function createReleaseFixture(files) {
  const repoRoot = mkdtempSync(path.join(tmpdir(), 'codegraphy-release-test-'));
  writeFile(repoRoot, 'package.json', {
    workspaces: ['packages/*'],
  });

  for (const [relativePath, contents] of Object.entries(files)) {
    writeFile(repoRoot, relativePath, contents);
  }

  return repoRoot;
}

function writeFile(repoRoot, relativePath, contents) {
  const absolutePath = path.join(repoRoot, relativePath);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(contents, null, 2)}\n`);
}

function packageManifest(name, overrides = {}) {
  return {
    name,
    version: '1.0.0',
    publishConfig: { access: 'public' },
    scripts: { build: 'echo build' },
    ...overrides,
  };
}
