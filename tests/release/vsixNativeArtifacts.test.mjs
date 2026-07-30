import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  identifyNativeBinary,
  validateVsixNativeArtifacts,
} from '../../scripts/validate-vsix-native-artifacts.mjs';

test('identifies Linux x64 native binaries from ELF headers', () => {
  const binary = Buffer.alloc(20);
  binary.set([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00], 0);
  binary.writeUInt16LE(0x3e, 18);

  assert.equal(identifyNativeBinary(binary), 'ELF x86-64');
});

test('identifies macOS Apple Silicon native binaries from Mach-O headers', () => {
  const binary = Buffer.alloc(8);
  binary.writeUInt32LE(0xfeedfacf, 0);
  binary.writeInt32LE(0x0100000c, 4);

  assert.equal(identifyNativeBinary(binary), 'Mach-O arm64');
});

test('identifies Windows x64 native binaries from PE headers', () => {
  const binary = Buffer.alloc(160);
  binary.write('MZ', 0, 'ascii');
  binary.writeUInt32LE(0x80, 0x3c);
  binary.write('PE\0\0', 0x80, 'ascii');
  binary.writeUInt16LE(0x8664, 0x84);
  binary.writeUInt16LE(0x20b, 0x98);

  assert.equal(identifyNativeBinary(binary), 'PE32+ x86-64');
});

test('rejects a linux x64 VSIX with a macOS Apple Silicon Tree-sitter binding', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'codegraphy-vsix-native-artifacts-'));
  const artifactsDir = path.join(tempDir, 'artifacts');
  const version = '5.8.0';

  writeVsixFixture({
    artifactsDir,
    version,
    target: 'linux-x64',
    sqliteBinary: createElfX64Binary(),
    treeSitterBinary: createMachOArm64Binary(),
  });
  writeVsixFixture({
    artifactsDir,
    version,
    target: 'darwin-arm64',
    sqliteBinary: createMachOArm64Binary(),
    treeSitterBinary: createMachOArm64Binary(),
  });
  writeVsixFixture({
    artifactsDir,
    version,
    target: 'win32-x64',
    sqliteBinary: createPe32PlusX64Binary(),
    treeSitterBinary: createPe32PlusX64Binary(),
  });

  assert.throws(
    () => validateVsixNativeArtifacts({ artifactsDir, version }),
    /linux-x64\.vsix contains Mach-O arm64 at extension\/dist\/node_modules\/tree-sitter\/prebuilds\/linux-x64\/tree-sitter\.node; expected ELF x86-64\./,
  );
});

test('validates target-specific plugin-local esbuild executables for every VSIX target', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'codegraphy-vsix-native-artifacts-target-'));
  const artifactsDir = path.join(tempDir, 'artifacts');
  const version = '5.8.0';

  for (const target of ['linux-x64', 'darwin-arm64', 'win32-x64']) {
    writeVsixFixture({
      artifactsDir,
      version,
      target,
      sqliteBinary: nativeBinaryForTarget(target),
      treeSitterBinary: nativeBinaryForTarget(target),
      parcelWatcherBinary: nativeBinaryForTarget(target),
      pluginEsbuildBinary: nativeBinaryForTarget(target),
    });
  }

  assert.doesNotThrow(
    () => validateVsixNativeArtifacts({ artifactsDir, version }),
  );
});

test('rejects a VSIX with the wrong plugin-local esbuild executable', () => {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'codegraphy-vsix-native-artifacts-esbuild-'));
  const artifactsDir = path.join(tempDir, 'artifacts');
  const version = '5.8.0';

  writeVsixFixture({
    artifactsDir,
    version,
    target: 'linux-x64',
    sqliteBinary: createElfX64Binary(),
    treeSitterBinary: createElfX64Binary(),
    parcelWatcherBinary: createElfX64Binary(),
    pluginEsbuildBinary: createMachOArm64Binary(),
  });

  assert.throws(
    () => validateVsixNativeArtifacts({ artifactsDir, version, targets: ['linux-x64'] }),
    /plugin-particles\/dist\/node_modules\/@esbuild\/linux-x64\/bin\/esbuild; expected ELF x86-64\./,
  );
});

test('rejects old root esbuild wrapper and native package paths', () => {
  const version = '5.8.0';

  for (const [oldRootEsbuildPath, forbiddenPrefix] of [
    [
      'extension/dist/node_modules/esbuild/lib/main.js',
      'extension/dist/node_modules/esbuild/',
    ],
    [
      'extension/dist/node_modules/@esbuild/linux-x64/bin/esbuild',
      'extension/dist/node_modules/@esbuild/linux-x64/',
    ],
  ]) {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'codegraphy-vsix-root-esbuild-'));
    const artifactsDir = path.join(tempDir, 'artifacts');
    writeVsixFixture({
      artifactsDir,
      version,
      target: 'linux-x64',
      sqliteBinary: createElfX64Binary(),
      treeSitterBinary: createElfX64Binary(),
      parcelWatcherBinary: createElfX64Binary(),
      pluginEsbuildBinary: createElfX64Binary(),
      oldRootEsbuildPath,
    });

    assert.throws(
      () => validateVsixNativeArtifacts({ artifactsDir, version, targets: ['linux-x64'] }),
      new RegExp(`must not contain old root esbuild path ${forbiddenPrefix}`),
    );
  }
});

function writeVsixFixture({
  artifactsDir,
  version,
  target,
  sqliteBinary,
  treeSitterBinary,
  parcelWatcherBinary,
  pluginEsbuildBinary,
  oldRootEsbuildPath,
}) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), `codegraphy-vsix-${target}-`));
  writeFixtureBinary(
    fixtureRoot,
    libsqlNativeBinaryPath(target),
    sqliteBinary,
  );
  writeFixtureBinary(
    fixtureRoot,
    treeSitterNativeBinaryPath(target),
    treeSitterBinary,
  );
  writeFixtureBinary(
    fixtureRoot,
    parcelWatcherNativeBinaryPath(target),
    parcelWatcherBinary ?? nativeBinaryForTarget(target),
  );
  writeFixtureBinary(
    fixtureRoot,
    pluginEsbuildNativeBinaryPath(target),
    pluginEsbuildBinary ?? nativeBinaryForTarget(target),
  );
  if (oldRootEsbuildPath) {
    writeFixtureBinary(fixtureRoot, oldRootEsbuildPath, nativeBinaryForTarget(target));
  }

  mkdirSync(artifactsDir, { recursive: true });
  const vsixPath = path.join(artifactsDir, `codegraphy.codegraphy-${version}-${target}.vsix`);
  const zipResult = spawnSync('zip', ['-qr', vsixPath, 'extension'], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });

  if (zipResult.status !== 0) {
    throw new Error(`Unable to create VSIX fixture for ${target}.\n${zipResult.stderr}`);
  }
}

function libsqlNativeBinaryPath(target) {
  const packageByTarget = {
    'linux-x64': 'linux-x64-gnu',
    'darwin-arm64': 'darwin-arm64',
    'win32-x64': 'win32-x64-msvc',
  };
  return `extension/dist/node_modules/@libsql/${packageByTarget[target]}/index.node`;
}

function treeSitterNativeBinaryPath(target) {
  const prebuildByTarget = {
    'linux-x64': 'linux-x64',
    'darwin-arm64': 'darwin-arm64',
    'win32-x64': 'win32-x64',
  };
  return `extension/dist/node_modules/tree-sitter/prebuilds/${prebuildByTarget[target]}/tree-sitter.node`;
}

function parcelWatcherNativeBinaryPath(target) {
  const packageByTarget = {
    'linux-x64': 'watcher-linux-x64-glibc',
    'darwin-arm64': 'watcher-darwin-arm64',
    'win32-x64': 'watcher-win32-x64',
  };
  return `extension/dist/node_modules/@parcel/${packageByTarget[target]}/watcher.node`;
}

function pluginEsbuildNativeBinaryPath(target) {
  const executablePathByTarget = {
    'linux-x64': '@esbuild/linux-x64/bin/esbuild',
    'darwin-arm64': '@esbuild/darwin-arm64/bin/esbuild',
    'win32-x64': '@esbuild/win32-x64/esbuild.exe',
  };
  return `extension/packages/plugin-particles/dist/node_modules/${executablePathByTarget[target]}`;
}

function nativeBinaryForTarget(target) {
  if (target === 'linux-x64') return createElfX64Binary();
  if (target === 'darwin-arm64') return createMachOArm64Binary();
  return createPe32PlusX64Binary();
}

function writeFixtureBinary(rootDir, relativePath, binary) {
  const filePath = path.join(rootDir, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, binary);
}

function createElfX64Binary() {
  const binary = Buffer.alloc(20);
  binary.set([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00], 0);
  binary.writeUInt16LE(0x3e, 18);
  return binary;
}

function createMachOArm64Binary() {
  const binary = Buffer.alloc(8);
  binary.writeUInt32LE(0xfeedfacf, 0);
  binary.writeInt32LE(0x0100000c, 4);
  return binary;
}

function createPe32PlusX64Binary() {
  const binary = Buffer.alloc(160);
  binary.write('MZ', 0, 'ascii');
  binary.writeUInt32LE(0x80, 0x3c);
  binary.write('PE\0\0', 0x80, 'ascii');
  binary.writeUInt16LE(0x8664, 0x84);
  binary.writeUInt16LE(0x20b, 0x98);
  return binary;
}
