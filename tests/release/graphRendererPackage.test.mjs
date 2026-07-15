import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { collectReleaseTargets } from '../../scripts/release.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const packageName = '@codegraphy-dev/graph-renderer';

function run(command, args, cwd = repoRoot) {
  return spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

function requireSuccess(result, label) {
  assert.equal(
    result.status,
    0,
    `${label} failed\n${result.stdout ?? ''}${result.stderr ?? ''}`,
  );
}

test('the graph renderer is a public npm release target', () => {
  assert.deepEqual(
    collectReleaseTargets(repoRoot).find(target => target.packageName === packageName),
    {
      access: 'public',
      aliases: ['graph-renderer', packageName],
      hasBuildScript: true,
      id: 'graph-renderer',
      kind: 'npm',
      packageName,
      version: '0.0.0',
    },
  );
});

test('the graph renderer tarball contains a runnable public package', () => {
  const artifactDirectory = mkdtempSync(path.join(tmpdir(), 'codegraphy-graph-renderer-pack-'));
  const consumerDirectory = mkdtempSync(path.join(tmpdir(), 'codegraphy-graph-renderer-consumer-'));

  requireSuccess(
    run('pnpm', ['--filter', packageName, 'run', 'build']),
    'graph renderer build',
  );
  requireSuccess(
    run('pnpm', ['--filter', packageName, 'pack', '--pack-destination', artifactDirectory]),
    'graph renderer pack',
  );

  const tarball = path.join(
    artifactDirectory,
    readdirSync(artifactDirectory).find(fileName => fileName.endsWith('.tgz')) ?? '',
  );
  assert.notEqual(tarball, artifactDirectory, 'Expected pnpm pack to create a tarball');

  const listing = run('tar', ['-tf', tarball]);
  requireSuccess(listing, 'graph renderer tarball listing');
  const files = listing.stdout.trim().split('\n');
  assert(files.every(fileName => [
    'package/package.json',
    'package/README.md',
    'package/LICENSE',
  ].includes(fileName) || fileName.startsWith('package/dist/')));
  assert(files.includes('package/dist/index.js'));
  assert(files.includes('package/dist/index.d.ts'));
  assert(files.includes('package/dist/generated/physics.wasm'));

  writeFileSync(path.join(consumerDirectory, 'package.json'), '{"type":"module"}\n');
  requireSuccess(
    run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], consumerDirectory),
    'graph renderer consumer install',
  );
  const smokeTest = [
    "import { readFile } from 'node:fs/promises';",
    `const renderer = await import('${packageName}');`,
    "for (const name of ['createGraphLayoutEngine', 'OwnedWebGpuRenderer', 'prepareGraphPhysics']) if (typeof renderer[name] !== 'function') throw new Error(`Missing ${name}`);",
    "for (const name of ['DEFAULT_GRAPH_LAYOUT_CONFIG', 'TypedGraphLayoutEngine', 'installGraphPhysicsModule', 'parseWebGpuColor', 'webGpuNodeShapeCode']) if (name in renderer) throw new Error(`Unexpected internal export ${name}`);",
    `const loaderUrl = import.meta.resolve('${packageName}');`,
    "const wasm = await readFile(new URL('./generated/physics.wasm', loaderUrl));",
    "if (!WebAssembly.validate(wasm)) throw new Error('Invalid packaged physics WASM');",
  ].join('\n');
  requireSuccess(
    run('node', ['--input-type=module', '--eval', smokeTest], consumerDirectory),
    'graph renderer consumer import',
  );
});
