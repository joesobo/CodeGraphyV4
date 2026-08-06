import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appRoot, '../..');
const runtimeRoot = path.join(appRoot, 'src-tauri', 'runtime');
const binaryRoot = path.join(appRoot, 'src-tauri', 'binaries');
const nodeVersion = '22.23.2';
const hostTargetByArchitecture = {
  arm64: 'aarch64-apple-darwin',
  x64: 'x86_64-apple-darwin',
};
const nodeDistributionArchitecture = {
  arm64: 'arm64',
  x64: 'x64',
};

if (process.platform !== 'darwin') {
  throw new Error('CodeGraphy desktop sidecars must be staged on macOS.');
}

const hostTarget = hostTargetByArchitecture[process.arch];
if (!hostTarget) throw new Error(`Unsupported macOS architecture: ${process.arch}`);
const target = process.env.CODEGRAPHY_DESKTOP_TARGET ?? hostTarget;
if (target !== hostTarget) {
  throw new Error(`Cannot stage ${hostTarget} native Core modules for ${target}.`);
}

const runtimeCache = process.env.CODEGRAPHY_DESKTOP_RUNTIME_CACHE
  ?? path.join(os.homedir(), 'Library', 'Caches', 'CodeGraphy', 'desktop-runtime');
const nodeArchiveName = `node-v${nodeVersion}-darwin-${nodeDistributionArchitecture[process.arch]}.tar.gz`;
const nodeDistributionRoot = path.join(runtimeCache, nodeArchiveName.replace(/\.tar\.gz$/u, ''));
const nodeExecutable = path.join(nodeDistributionRoot, 'bin', 'node');
if (!existsSync(nodeExecutable)) {
  mkdirSync(runtimeCache, { recursive: true });
  const archivePath = path.join(runtimeCache, nodeArchiveName);
  execFileSync('curl', [
    '--fail',
    '--location',
    '--output',
    archivePath,
    `https://nodejs.org/dist/v${nodeVersion}/${nodeArchiveName}`,
  ], { stdio: 'inherit' });
  execFileSync('tar', ['-xzf', archivePath, '-C', runtimeCache], { stdio: 'inherit' });
}
execFileSync(nodeExecutable, ['--version'], { stdio: 'inherit' });

execFileSync('pnpm', [
  '-w',
  'exec',
  'turbo',
  'run',
  'build',
  '--filter=@codegraphy-dev/core...',
], { cwd: repoRoot, stdio: 'inherit' });

rmSync(runtimeRoot, { force: true, recursive: true });
mkdirSync(runtimeRoot, { recursive: true });
execFileSync('pnpm', [
  '--config.node-linker=hoisted',
  '--filter',
  '@codegraphy-dev/core',
  'deploy',
  '--legacy',
  '--prod',
  path.join(runtimeRoot, 'core'),
], { cwd: repoRoot, stdio: 'inherit' });
// Hoisted deploy can rewrite shared workspace linker metadata. Restore the
// checked-in lockfile layout before any repository build or test continues.
execFileSync('pnpm', ['install', '--frozen-lockfile'], { cwd: repoRoot, stdio: 'inherit' });
copyFileSync(path.join(appRoot, 'scripts', 'core-sidecar.mjs'), path.join(runtimeRoot, 'sidecar.mjs'));
execFileSync(nodeExecutable, [
  '--input-type=module',
  '--eval',
  `await import(${JSON.stringify(pathToFileURL(path.join(runtimeRoot, 'core', 'dist', 'index.js')).href)})`,
], { stdio: 'inherit' });

mkdirSync(binaryRoot, { recursive: true });
const sidecarPath = path.join(binaryRoot, `codegraphy-core-${target}`);
copyFileSync(nodeExecutable, sidecarPath);
chmodSync(sidecarPath, 0o755);

const licensesSource = path.join(repoRoot, 'LICENSE');
cpSync(licensesSource, path.join(runtimeRoot, 'LICENSE'));
