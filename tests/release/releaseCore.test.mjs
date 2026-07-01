import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import * as releaseCore from '../../scripts/release-core.mjs';

test('core extension release includes built-in Unity plugin icon assets', () => {
  const rootManifest = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
  );

  assert.ok(
    releaseCore.collectCoreReleaseEntries(rootManifest).includes('packages/plugin-unity/assets'),
    'Unity plugin icon assets must be staged so plugin legend and graph node image URLs resolve in packaged webviews.',
  );
});

test('core extension release includes the bundled Unity plugin runtime and manifest', () => {
  const rootManifest = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
  );
  const entries = releaseCore.collectCoreReleaseEntries(rootManifest);

  assert.ok(
    entries.includes('packages/plugin-unity/codegraphy.json'),
    'Unity plugin manifest must be staged so packaged extension defaults match the bundled runtime.',
  );
  assert.ok(
    entries.includes('packages/plugin-unity/dist'),
    'Unity plugin runtime must be staged so packaged extensions can load the bundled Unity plugin.',
  );
});

test('core extension release declares platform-specific VSIX targets', () => {
  assert.deepEqual(releaseCore.EXTENSION_VSIX_TARGETS, [
    'linux-x64',
    'darwin-arm64',
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
      ['publish', '--no-dependencies', '--skip-duplicate', '--target', 'win32-x64'],
    ],
  );
});

test('release preparation builds bundled workspace plugin packages before staging', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-release-build-filters-'));
  const repoDir = path.join(tempDir, 'repo');
  const commands = [];

  fs.mkdirSync(path.join(repoDir, 'packages', 'plugin-example'), { recursive: true });
  fs.writeFileSync(
    path.join(repoDir, 'package.json'),
    JSON.stringify({
      files: [
        'dist/**',
        'packages/plugin-example/dist/**',
      ],
    }),
  );
  fs.writeFileSync(
    path.join(repoDir, 'packages', 'plugin-example', 'package.json'),
    JSON.stringify({
      name: '@acme/codegraphy-plugin-example',
    }),
  );

  releaseCore.prepareCoreReleaseBase(repoDir, (command, args, options) => {
    commands.push({ command, args, options });
  });

  assert.deepEqual(commands, [{
    command: 'pnpm',
    args: [
      '-w',
      'exec',
      'turbo',
      'run',
      'build',
      '--filter=@codegraphy-dev/extension...',
      '--filter=@acme/codegraphy-plugin-example...',
    ],
    options: { cwd: repoDir },
  }]);
});

test('resolves the VSIX target that matches the host native runtime', () => {
  assert.equal(
    releaseCore.resolveHostVsixTarget({ platform: 'linux', arch: 'x64' }),
    'linux-x64',
  );
  assert.equal(
    releaseCore.resolveHostVsixTarget({ platform: 'darwin', arch: 'arm64' }),
    'darwin-arm64',
  );
  assert.equal(
    releaseCore.resolveHostVsixTarget({ platform: 'win32', arch: 'x64' }),
    'win32-x64',
  );
});

test('rejects cross-target VSIX packaging for host-built Tree-sitter bindings', () => {
  assert.throws(
    () => releaseCore.resolveCoreVsixTargets({
      requestedTargets: ['linux-x64', 'darwin-arm64'],
      platform: 'darwin',
      arch: 'arm64',
    }),
    /Cannot package darwin-arm64 host-built native runtime for linux-x64 VSIX/,
  );
});

test('allows one explicitly requested target when it matches the host native runtime', () => {
  assert.deepEqual(
    releaseCore.resolveCoreVsixTargets({
      requestedTargets: ['linux-x64'],
      platform: 'linux',
      arch: 'x64',
    }),
    ['linux-x64'],
  );
});

test('stages the target LadybugDB native binary before packaging a target VSIX', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-release-native-'));
  const stageDir = path.join(tempDir, 'stage');
  const linuxBinaryPath = path.join(tempDir, 'native', 'linux-x64', 'lbugjs.node');
  const stagedBinaryPath = path.join(
    stageDir,
    'dist',
    'node_modules',
    '@ladybugdb',
    'core',
    'lbugjs.node',
  );

  fs.mkdirSync(path.dirname(linuxBinaryPath), { recursive: true });
  fs.mkdirSync(path.dirname(stagedBinaryPath), { recursive: true });
  fs.writeFileSync(linuxBinaryPath, 'ELF linux x64');
  fs.writeFileSync(stagedBinaryPath, 'Mach-O darwin arm64');

  releaseCore.stageTargetLadybugNativeBinary({
    stageDir,
    target: 'linux-x64',
    resolveNativeBinaryPath: target => {
      assert.equal(target, 'linux-x64');
      return linuxBinaryPath;
    },
  });

  assert.equal(fs.readFileSync(stagedBinaryPath, 'utf8'), 'ELF linux x64');
});

test('resolves target LadybugDB native binary from a fetched optional package when it is not installed', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-release-native-fetch-'));
  const baseDir = path.join(tempDir, 'repo');
  const cacheDir = path.join(tempDir, 'cache');
  const packageCacheDir = path.join(cacheDir, 'ladybugdb-core-linux-x64-0.15.3');
  const linuxBinaryPath = path.join(
    packageCacheDir,
    'package',
    'lbugjs.node',
  );

  fs.mkdirSync(path.join(baseDir, 'node_modules', '@ladybugdb', 'core'), { recursive: true });
  fs.writeFileSync(
    path.join(baseDir, 'node_modules', '@ladybugdb', 'core', 'package.json'),
    JSON.stringify({
      optionalDependencies: {
        '@ladybugdb/core-linux-x64': '0.15.3',
      },
    }),
  );

  const resolvedPath = releaseCore.resolveLadybugNativeBinaryPath({
    target: 'linux-x64',
    baseDir,
    cacheDir,
    fetchNativePackage: ({ packageName, version, destinationDir }) => {
      assert.equal(packageName, '@ladybugdb/core-linux-x64');
      assert.equal(version, '0.15.3');
      assert.equal(destinationDir, packageCacheDir);
      fs.mkdirSync(path.dirname(linuxBinaryPath), { recursive: true });
      fs.writeFileSync(linuxBinaryPath, 'ELF linux x64');
      return path.join(packageCacheDir, 'ladybugdb-core-linux-x64-0.15.3.tgz');
    },
  });

  assert.equal(resolvedPath, linuxBinaryPath);
});
