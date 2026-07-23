import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const repoRoot = process.cwd();
const packageRoot = path.join(repoRoot, 'packages', 'tldraw');
const coreManifest = JSON.parse(fs.readFileSync(
  path.join(repoRoot, 'packages', 'core', 'package.json'),
  'utf8',
));
const sourceManifest = JSON.parse(fs.readFileSync(
  path.join(packageRoot, 'package.json'),
  'utf8',
));

function authoredJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return authoredJavaScriptFiles(entryPath);
    return /\.(?:c|m)?js$/u.test(entry.name) ? [entryPath] : [];
  });
}

function packTldraw(destination) {
  execFileSync('pnpm', [
    'exec',
    'turbo',
    'run',
    'build',
    '--filter=@codegraphy-dev/tldraw...',
  ], {
    cwd: repoRoot,
    stdio: 'pipe',
  });
  const output = execFileSync('pnpm', ['pack', '--pack-destination', destination], {
    cwd: packageRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  const tarball = output.split(/\r?\n/u).at(-1);
  assert.ok(tarball, 'pnpm pack must report the generated tarball');
  execFileSync('tar', ['-xzf', tarball, '-C', destination]);
  return path.join(destination, 'package');
}

test('published tldraw package contains its launcher, force panel, and embedded physics script', () => {
  const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-tldraw-package-'));
  try {
    const unpackedPackage = packTldraw(destination);
    const manifest = JSON.parse(fs.readFileSync(
      path.join(unpackedPackage, 'package.json'),
      'utf8',
    ));
    const documentScript = fs.readFileSync(
      path.join(unpackedPackage, 'dist', 'script', 'main.js'),
      'utf8',
    );
    const documentConfig = fs.readFileSync(
      path.join(unpackedPackage, 'dist', 'script', 'config.js'),
      'utf8',
    );

    assert.deepEqual(fs.readdirSync(unpackedPackage).sort(), [
      'CHANGELOG.md',
      'LICENSE',
      'README.md',
      'bin',
      'dist',
      'package.json',
    ]);
    assert.equal(manifest.bin['codegraphy-tldraw'], './bin/codegraphy-tldraw.js');
    assert.deepEqual(manifest.os, ['darwin']);
    assert.equal(manifest.engines.node, coreManifest.engines.node);
    assert.equal(manifest.dependencies['@codegraphy-dev/graph-renderer'], undefined);
    assert.equal(
      manifest.devDependencies['@codegraphy-dev/graph-renderer'].startsWith('workspace:'),
      false,
    );
    assert.ok(fs.existsSync(path.join(unpackedPackage, 'dist', 'index.js')));
    assert.match(documentScript, /AGFzb/u);
    assert.match(documentConfig, /CodeGraphy forces/u);
    assert.match(documentConfig, /Repel Force/u);
    assert.doesNotMatch(documentScript, /Q09ERUdSQVBIWV9QSFlTSUNTX1dBU00=/u);
    assert.doesNotMatch(documentScript, /navigator\.gpu|GPUDevice|GPUCanvasContext/u);
    assert.doesNotMatch(
      fs.readFileSync(path.join(unpackedPackage, 'dist', 'index.js'), 'utf8'),
      /@codegraphy-dev\/graph-renderer/u,
    );
    assert.equal(fs.existsSync(path.join(unpackedPackage, 'dist', 'core')), false);
  } finally {
    fs.rmSync(destination, { force: true, recursive: true });
  }
}, { timeout: 30_000 });

test('tldraw package keeps authored logic in checked TypeScript files', () => {
  assert.deepEqual(Object.keys(sourceManifest.scripts).sort(), [
    'build',
    'lint',
    'test',
    'typecheck',
  ]);
  assert.equal(sourceManifest.scripts.build, 'tsx ./scripts/build.ts');
  assert.match(sourceManifest.scripts.lint, /\bscripts\b/u);
  assert.deepEqual(
    authoredJavaScriptFiles(path.join(packageRoot, 'scripts')),
    [],
  );
  assert.ok(fs.existsSync(path.join(packageRoot, 'scripts', 'build.ts')));
});
