import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const EXTENSION_VSIX_TARGETS = [
  'linux-x64',
  'darwin-arm64',
  'win32-x64',
];

const LADYBUG_NATIVE_PACKAGE_BY_TARGET = {
  'linux-x64': '@ladybugdb/core-linux-x64',
  'darwin-arm64': '@ladybugdb/core-darwin-arm64',
  'win32-x64': '@ladybugdb/core-win32-x64',
};

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
  runCommand('pnpm', ['--filter', '@codegraphy-dev/extension', 'run', 'build'], {
    cwd: baseDir,
  });
}

export function createCoreVsceInvocations({
  mode,
  version,
  artifactsDir,
  targets = EXTENSION_VSIX_TARGETS,
}) {
  return targets.map((target) => {
    if (mode === 'package') {
      return {
        target,
        args: [
          'package',
          '--no-dependencies',
          '--target',
          target,
          '--out',
          path.join(artifactsDir, `codegraphy.codegraphy-${version}-${target}.vsix`),
        ],
      };
    }

    return {
      target,
      args: [
        'publish',
        '--no-dependencies',
        '--skip-duplicate',
        '--target',
        target,
      ],
    };
  });
}

function getStagedLadybugNativeBinaryPath(stageDir) {
  return path.join(
    stageDir,
    'dist',
    'node_modules',
    '@ladybugdb',
    'core',
    'lbugjs.node',
  );
}

function resolveInstalledLadybugNativeBinaryPath(target, baseDir = repoRoot) {
  const nativePackageName = LADYBUG_NATIVE_PACKAGE_BY_TARGET[target];
  if (!nativePackageName) {
    throw new Error(`Unsupported CodeGraphy VSIX target: ${target}`);
  }

  const candidatePaths = [
    path.join(
      baseDir,
      'packages',
      'extension',
      'node_modules',
      ...nativePackageName.split('/'),
      'lbugjs.node',
    ),
    path.join(
      baseDir,
      'node_modules',
      ...nativePackageName.split('/'),
      'lbugjs.node',
    ),
  ];
  const binaryPath = candidatePaths.find(candidatePath => existsSync(candidatePath));

  if (!binaryPath) {
    throw new Error(
      `Unable to find ${nativePackageName}/lbugjs.node for ${target}. `
      + 'Run pnpm install with optional dependencies enabled before releasing.',
    );
  }

  return binaryPath;
}

export function stageTargetLadybugNativeBinary({
  stageDir,
  target,
  resolveNativeBinaryPath = resolveInstalledLadybugNativeBinaryPath,
}) {
  const sourcePath = resolveNativeBinaryPath(target);
  const targetPath = getStagedLadybugNativeBinaryPath(stageDir);

  mkdirSync(path.dirname(targetPath), { recursive: true });
  cpSync(sourcePath, targetPath);
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
    for (const invocation of createCoreVsceInvocations({ mode, version, artifactsDir })) {
      stageTargetLadybugNativeBinary({ stageDir, target: invocation.target });
      run(
        'vsce',
        invocation.args,
        { cwd: stageDir, env },
      );
    }
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}

const [, , mode] = process.argv;

if (mode) {
  runCoreRelease(mode);
}
