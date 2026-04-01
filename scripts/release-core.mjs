import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function collectCoreReleaseEntries(rootManifest) {
  const files = Array.isArray(rootManifest.files) ? rootManifest.files : [];
  const seen = new Set();

  return files
    .map((entry) => {
      if (entry.endsWith('/**')) {
        return entry.slice(0, -3);
      }

      if (entry.endsWith('/*')) {
        return entry.slice(0, -2);
      }

      return entry;
    })
    .filter((entry) => {
      if (!entry || seen.has(entry)) {
        return false;
      }

      seen.add(entry);
      return true;
    });
}

export function buildCoreReleaseManifest(rootManifest, extensionManifest) {
  const manifest = structuredClone(rootManifest);

  manifest.version = extensionManifest.version;

  delete manifest.packageManager;
  delete manifest.workspaces;
  delete manifest.scripts;

  return manifest;
}

function createCoreReleaseStage(baseDir) {
  const rootManifest = readJson(path.join(baseDir, 'package.json'));
  const extensionManifest = readJson(path.join(baseDir, 'packages/extension/package.json'));
  const stageDir = mkdtempSync(path.join(tmpdir(), 'codegraphy-core-release-'));

  for (const entry of collectCoreReleaseEntries(rootManifest)) {
    const sourcePath = path.join(baseDir, entry);
    const targetPath = path.join(stageDir, entry);

    mkdirSync(path.dirname(targetPath), { recursive: true });
    cpSync(sourcePath, targetPath, { recursive: true });
  }

  writeFileSync(
    path.join(stageDir, 'package.json'),
    `${JSON.stringify(buildCoreReleaseManifest(rootManifest, extensionManifest), null, 2)}\n`,
  );

  return {
    stageDir,
    version: extensionManifest.version,
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: true,
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

export function prepareCoreReleaseBase(baseDir = repoRoot, runCommand = run) {
  runCommand('pnpm', ['--filter', '@codegraphy/extension', 'run', 'build'], {
    cwd: baseDir,
  });
}

export function runCoreRelease(mode, baseDir = repoRoot) {
  if (mode !== 'package' && mode !== 'publish') {
    console.error('Usage: node scripts/release-core.mjs <package|publish>');
    process.exit(1);
  }

  prepareCoreReleaseBase(baseDir);
  const { stageDir, version } = createCoreReleaseStage(baseDir);
  const artifactsDir = path.join(baseDir, 'artifacts', 'vsix');
  const env = {
    ...process.env,
    PATH: `${path.join(baseDir, 'node_modules', '.bin')}${path.delimiter}${process.env.PATH ?? ''}`,
  };

  mkdirSync(artifactsDir, { recursive: true });

  try {
    if (mode === 'package') {
      run(
        'vsce',
        [
          'package',
          '--no-dependencies',
          '--out',
          path.join(artifactsDir, `codegraphy.codegraphy-${version}.vsix`),
        ],
        { cwd: stageDir, env },
      );

      return;
    }

    run(
      'vsce',
      ['publish', '--no-dependencies', '--skip-duplicate'],
      { cwd: stageDir, env },
    );
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}

const [, , mode] = process.argv;

if (mode) {
  runCoreRelease(mode);
}
