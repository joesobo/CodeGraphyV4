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

const EXTENSION_VSIX_HOST_BY_TARGET = {
  'linux-x64': { platform: 'linux', arch: 'x64' },
  'darwin-arm64': { platform: 'darwin', arch: 'arm64' },
  'win32-x64': { platform: 'win32', arch: 'x64' },
};

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

export function collectCoreReleaseBuildFilters(rootManifest, baseDir = repoRoot) {
  const filters = ['@codegraphy-dev/extension...'];

  for (const entry of collectCoreReleaseEntries(rootManifest)) {
    if (!/^packages\/[^/]+\/dist$/.test(entry)) {
      continue;
    }

    const packageManifestPath = path.join(baseDir, path.dirname(entry), 'package.json');
    if (!existsSync(packageManifestPath)) {
      continue;
    }

    const packageManifest = readJson(packageManifestPath);
    if (typeof packageManifest.name === 'string' && packageManifest.name.length > 0) {
      filters.push(`${packageManifest.name}...`);
    }
  }

  return [...new Set(filters)];
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
  const rootManifest = readJson(path.join(baseDir, 'package.json'));
  runCommand('pnpm', [
    '-w',
    'exec',
    'turbo',
    'run',
    'build',
    ...collectCoreReleaseBuildFilters(rootManifest, baseDir)
      .map(filter => `--filter=${filter}`),
  ], {
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

export function resolveHostVsixTarget({
  platform = process.platform,
  arch = process.arch,
} = {}) {
  const hostTarget = EXTENSION_VSIX_TARGETS.find((target) => {
    const host = EXTENSION_VSIX_HOST_BY_TARGET[target];
    return host.platform === platform && host.arch === arch;
  });

  if (!hostTarget) {
    throw new Error(
      `Unsupported VSIX native build host: ${platform}-${arch}. `
      + `Supported hosts are ${EXTENSION_VSIX_TARGETS.join(', ')}.`,
    );
  }

  return hostTarget;
}

export function parseRequestedVsixTargets(value) {
  if (!value) {
    return undefined;
  }

  return value
    .split(',')
    .map(target => target.trim())
    .filter(Boolean);
}

export function resolveCoreVsixTargets({
  requestedTargets,
  platform = process.platform,
  arch = process.arch,
} = {}) {
  const hostTarget = resolveHostVsixTarget({ platform, arch });
  const targets = requestedTargets ?? [hostTarget];
  const unsupportedTarget = targets.find(target => !EXTENSION_VSIX_TARGETS.includes(target));

  if (unsupportedTarget) {
    throw new Error(
      `Unsupported CodeGraphy VSIX target: ${unsupportedTarget}. `
      + `Supported targets are ${EXTENSION_VSIX_TARGETS.join(', ')}.`,
    );
  }

  for (const target of targets) {
    if (target !== hostTarget) {
      throw new Error(
        `Cannot package ${hostTarget} host-built native runtime for ${target} VSIX. `
        + 'Run this target on its matching release runner so Tree-sitter native bindings are built for the target platform.',
      );
    }
  }

  return targets;
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

function getLadybugCoreManifestPath(baseDir) {
  const candidatePaths = [
    path.join(
      baseDir,
      'packages',
      'extension',
      'node_modules',
      '@ladybugdb',
      'core',
      'package.json',
    ),
    path.join(
      baseDir,
      'node_modules',
      '@ladybugdb',
      'core',
      'package.json',
    ),
  ];

  const manifestPath = candidatePaths.find(candidatePath => existsSync(candidatePath));

  if (!manifestPath) {
    throw new Error(
      'Unable to find @ladybugdb/core/package.json. Run pnpm install before releasing.',
    );
  }

  return manifestPath;
}

function getLadybugNativePackageVersion(nativePackageName, baseDir) {
  const coreManifest = readJson(getLadybugCoreManifestPath(baseDir));
  const version = coreManifest.optionalDependencies?.[nativePackageName];

  if (!version) {
    throw new Error(
      `@ladybugdb/core does not declare ${nativePackageName} as an optional dependency.`,
    );
  }

  return version;
}

function fetchLadybugNativePackage({ packageName, version, destinationDir }) {
  mkdirSync(destinationDir, { recursive: true });

  const packResult = spawnSync(
    'npm',
    ['pack', `${packageName}@${version}`, '--pack-destination', destinationDir, '--silent'],
    {
      encoding: 'utf8',
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  if (packResult.status !== 0) {
    throw new Error(
      `Unable to download ${packageName}@${version} with npm pack.\n${packResult.stderr}`,
    );
  }

  const tarballName = packResult.stdout.trim().split('\n').at(-1);
  if (!tarballName) {
    throw new Error(`npm pack did not return a tarball name for ${packageName}@${version}.`);
  }

  const tarballPath = path.join(destinationDir, tarballName);
  const extractResult = spawnSync(
    'tar',
    ['-xzf', tarballPath, '-C', destinationDir],
    {
      encoding: 'utf8',
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  if (extractResult.status !== 0) {
    throw new Error(
      `Unable to extract ${tarballPath}.\n${extractResult.stderr}`,
    );
  }

  return tarballPath;
}

function getNativePackageCacheDir(cacheDir, packageName, version) {
  const cacheName = `${packageName.replace(/^@/, '').replaceAll('/', '-')}-${version}`;
  return path.join(cacheDir, cacheName);
}

export function resolveLadybugNativeBinaryPath({
  target,
  baseDir = repoRoot,
  cacheDir = mkdtempSync(path.join(tmpdir(), 'codegraphy-ladybug-native-')),
  fetchNativePackage = fetchLadybugNativePackage,
}) {
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

  if (binaryPath) {
    return binaryPath;
  }

  const version = getLadybugNativePackageVersion(nativePackageName, baseDir);
  const packageCacheDir = getNativePackageCacheDir(cacheDir, nativePackageName, version);

  fetchNativePackage({
    packageName: nativePackageName,
    version,
    destinationDir: packageCacheDir,
  });

  const fetchedBinaryPath = path.join(packageCacheDir, 'package', 'lbugjs.node');
  if (!existsSync(fetchedBinaryPath)) {
    throw new Error(
      `Downloaded ${nativePackageName}@${version}, but package/lbugjs.node was not found.`,
    );
  }

  return fetchedBinaryPath;
}

export function stageTargetLadybugNativeBinary({
  stageDir,
  target,
  resolveNativeBinaryPath = target => resolveLadybugNativeBinaryPath({ target }),
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

  const targets = resolveCoreVsixTargets({
    requestedTargets: parseRequestedVsixTargets(process.env.CODEGRAPHY_VSIX_TARGETS),
  });
  prepareCoreReleaseBase(baseDir);
  const { stageDir, version } = createCoreReleaseStage(baseDir);
  const nativeCacheDir = mkdtempSync(path.join(tmpdir(), 'codegraphy-ladybug-native-'));
  const artifactsDir = path.join(baseDir, 'artifacts', 'vsix');
  const env = {
    ...process.env,
    PATH: `${path.join(baseDir, 'node_modules', '.bin')}${path.delimiter}${process.env.PATH ?? ''}`,
  };

  mkdirSync(artifactsDir, { recursive: true });

  try {
    for (const invocation of createCoreVsceInvocations({ mode, version, artifactsDir, targets })) {
      stageTargetLadybugNativeBinary({
        stageDir,
        target: invocation.target,
        resolveNativeBinaryPath: target => resolveLadybugNativeBinaryPath({
          target,
          baseDir,
          cacheDir: nativeCacheDir,
        }),
      });
      run(
        'vsce',
        invocation.args,
        { cwd: stageDir, env },
      );
    }
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
    rmSync(nativeCacheDir, { recursive: true, force: true });
  }
}

const [, , mode] = process.argv;

if (mode) {
  runCoreRelease(mode);
}
