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
    plugins: ['particles'],
  },
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8'));
}

test('bundled plugin manifests declare the current runtime API consistently', () => {
  for (const host of PLUGIN_HOSTS) {
    for (const plugin of host.plugins) {
      const packageRoot = `packages/plugin-${plugin}`;
      const manifest = readJson(`${packageRoot}/codegraphy.json`);
      const packageManifest = readJson(`${packageRoot}/package.json`);
      const packagePlugin = packageManifest.codegraphy?.plugins?.find(
        candidate => candidate.id === manifest.id,
      );

      assert.equal(
        manifest.apiVersion,
        host.apiVersion,
        `${plugin} ${host.id} runtime manifest`,
      );
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
      assert.equal(
        packagePlugin.apiVersion,
        manifest.apiVersion,
        `${plugin} metadata agreement`,
      );
    }
  }
});

test('bundled plugin runtime versions match their package versions', () => {
  for (const host of PLUGIN_HOSTS) {
    for (const plugin of host.plugins) {
      const packageRoot = `packages/plugin-${plugin}`;
      const manifest = readJson(`${packageRoot}/codegraphy.json`);
      const packageManifest = readJson(`${packageRoot}/package.json`);

      assert.equal(
        manifest.version,
        packageManifest.version,
        `${plugin} runtime and package versions`,
      );
    }
  }
});

test('bundled plugin builds include runtime dependencies in their artifacts', () => {
  for (const host of PLUGIN_HOSTS) {
    for (const plugin of host.plugins) {
      const packageManifest = readJson(`packages/plugin-${plugin}/package.json`);

      assert.match(
        packageManifest.scripts?.build ?? '',
        /build-workspace-package\.mjs [^&]+ --bundle-dependencies(?:\s|$)/,
        `${plugin} runtime build must bundle dependencies for isolated VSIX loading`,
      );
      if (plugin === 'particles') {
        assert.match(packageManifest.scripts.build, /--external esbuild/);
        assert.match(packageManifest.scripts.build, /--vendor-package esbuild/);
      }
    }
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
