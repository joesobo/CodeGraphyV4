import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const PLUGIN_HOSTS = [
  {
    apiVersion: '^4.0.0',
    id: 'core',
    plugins: ['godot', 'markdown', 'svelte', 'typescript', 'unity', 'vue'],
  },
  {
    apiVersion: '^1.0.0',
    id: 'codegraphy.extension',
    plugins: ['particles', 'unity'],
  },
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8'));
}

test('bundled plugin descriptors declare the current host API consistently', () => {
  for (const host of PLUGIN_HOSTS) {
    for (const plugin of host.plugins) {
      const packageRoot = `packages/plugin-${plugin}`;
      const packageManifest = readJson(`${packageRoot}/package.json`);
      const packagePlugin = packageManifest.codegraphy?.plugins
        .find(descriptor => descriptor.host === host.id);
      assert.equal(
        packagePlugin?.host,
        host.id,
        `${plugin} package host`,
      );
      assert.equal(
        packagePlugin?.apiVersion,
        host.apiVersion,
        `${plugin} ${host.id} package metadata`,
      );
    }
  }
});

test('bundled plugin descriptors have stable IDs', () => {
  for (const plugin of new Set(PLUGIN_HOSTS.flatMap(host => host.plugins))) {
    const packageManifest = readJson(`packages/plugin-${plugin}/package.json`);
    for (const descriptor of packageManifest.codegraphy.plugins) {
      assert.match(descriptor.id, /^codegraphy\./);
    }
  }
});

test('bundled plugin packages own their builds', () => {
  for (const plugin of new Set(PLUGIN_HOSTS.flatMap(host => host.plugins))) {
    const packageManifest = readJson(`packages/plugin-${plugin}/package.json`);
    assert.ok(packageManifest.scripts?.build, `${plugin} build command`);
    assert.doesNotMatch(
      packageManifest.scripts.build,
      /\.\.\/\.\.\/scripts/,
      `${plugin} must not depend on repository-private build scripts`,
    );
    assert.equal(packageManifest.codegraphyBuild, undefined);
  }
});

test('public plugin API packages include publish and support metadata', () => {
  for (const packageName of ['plugin-api', 'extension-plugin-api']) {
    const packageManifest = readJson(`packages/${packageName}/package.json`);

    assert.equal(packageManifest.engines?.node, '>=20', `${packageName} Node.js engine`);
    assert.equal(
      packageManifest.repository?.url,
      'https://github.com/joesobo/CodeGraphyV4.git',
      `${packageName} repository`,
    );
    assert.equal(
      packageManifest.homepage,
      `https://github.com/joesobo/CodeGraphyV4/tree/main/packages/${packageName}`,
      `${packageName} homepage`,
    );
    assert.equal(
      packageManifest.bugs?.url,
      'https://github.com/joesobo/CodeGraphyV4/issues',
      `${packageName} issue tracker`,
    );
    assert.ok(packageManifest.keywords?.includes('codegraphy'), `${packageName} keywords`);
  }
});
