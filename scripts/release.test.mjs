import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { collectReleaseTargets, resolveReleaseTargets } from './release.mjs';

test('language plugin release targets resolve by short language name', () => {
  const repoRoot = createReleaseFixture({
    'packages/plugin-typescript/package.json': packageManifest('@codegraphy-dev/plugin-typescript'),
    'packages/plugin-svelte/package.json': packageManifest('@codegraphy-dev/plugin-svelte'),
    'packages/plugin-vue/package.json': packageManifest('@codegraphy-dev/plugin-vue'),
  });

  assert.deepEqual(resolveReleaseTargets('typescript', repoRoot).map(target => target.packageName), [
    '@codegraphy-dev/plugin-typescript',
  ]);
  assert.deepEqual(resolveReleaseTargets('svelte', repoRoot).map(target => target.packageName), [
    '@codegraphy-dev/plugin-svelte',
  ]);
  assert.deepEqual(resolveReleaseTargets('vue', repoRoot).map(target => target.packageName), [
    '@codegraphy-dev/plugin-vue',
  ]);
});

test('release target list exposes plugin and short aliases', () => {
  const repoRoot = createReleaseFixture({
    'packages/plugin-svelte/package.json': packageManifest('@codegraphy-dev/plugin-svelte'),
    'packages/plugin-vue/package.json': packageManifest('@codegraphy-dev/plugin-vue'),
  });

  const targets = collectReleaseTargets(repoRoot);

  assert.equal(targets.length, 3);
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
    id: 'plugin-vue',
    aliases: ['plugin-vue', 'vue', '@codegraphy-dev/plugin-vue'],
    kind: 'npm',
    packageName: '@codegraphy-dev/plugin-vue',
    version: '1.0.0',
    hasBuildScript: true,
    access: 'public',
  });
  assert.deepEqual(targets[2], {
    id: 'extension',
    aliases: ['extension', 'vsix', 'marketplace', 'core-extension'],
    kind: 'extension',
  });
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

function packageManifest(name) {
  return {
    name,
    version: '1.0.0',
    publishConfig: { access: 'public' },
    scripts: { build: 'echo build' },
  };
}
