import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const EXTENSION_RUNTIME_TARGETS = [
  'linux-x64',
  'darwin-arm64',
  'win32-x64',
] as const;

export type ExtensionRuntimeTarget = typeof EXTENSION_RUNTIME_TARGETS[number];

type RuntimeTargetConfig = {
  platform: NodeJS.Platform;
  arch: string;
  libsqlPackageName: string;
  esbuildPackageName: string;
  parcelWatcherPackageName: string;
  nativePrebuildDirectory: string;
};

export const RUNTIME_TARGET_CONFIG = {
  'linux-x64': {
    platform: 'linux',
    arch: 'x64',
    libsqlPackageName: '@libsql/linux-x64-gnu',
    esbuildPackageName: '@esbuild/linux-x64',
    parcelWatcherPackageName: '@parcel/watcher-linux-x64-glibc',
    nativePrebuildDirectory: 'linux-x64',
  },
  'darwin-arm64': {
    platform: 'darwin',
    arch: 'arm64',
    libsqlPackageName: '@libsql/darwin-arm64',
    esbuildPackageName: '@esbuild/darwin-arm64',
    parcelWatcherPackageName: '@parcel/watcher-darwin-arm64',
    nativePrebuildDirectory: 'darwin-arm64',
  },
  'win32-x64': {
    platform: 'win32',
    arch: 'x64',
    libsqlPackageName: '@libsql/win32-x64-msvc',
    esbuildPackageName: '@esbuild/win32-x64',
    parcelWatcherPackageName: '@parcel/watcher-win32-x64',
    nativePrebuildDirectory: 'win32-x64',
  },
} satisfies Record<ExtensionRuntimeTarget, RuntimeTargetConfig>;

type RuntimeTargetOptions = {
  environment?: Partial<Pick<NodeJS.ProcessEnv, 'CODEGRAPHY_VSIX_TARGETS'>>;
  platform?: NodeJS.Platform;
  arch?: string;
};

function isExtensionRuntimeTarget(value: string): value is ExtensionRuntimeTarget {
  return EXTENSION_RUNTIME_TARGETS.includes(value as ExtensionRuntimeTarget);
}

export function resolveExtensionRuntimeTarget({
  environment = process.env,
  platform = process.platform,
  arch = process.arch,
}: RuntimeTargetOptions = {}): ExtensionRuntimeTarget {
  const requestedTargets = environment.CODEGRAPHY_VSIX_TARGETS
    ?.split(',')
    .map(target => target.trim())
    .filter(Boolean);

  if (requestedTargets && requestedTargets.length !== 1) {
    throw new Error('Extension runtime staging requires exactly one VSIX target.');
  }

  const hostTarget = EXTENSION_RUNTIME_TARGETS.find((target) => {
    const config = RUNTIME_TARGET_CONFIG[target];
    return config.platform === platform && config.arch === arch;
  });
  if (!hostTarget) {
    throw new Error(
      `Unsupported extension runtime host: ${platform}-${arch}. `
      + `Supported targets are ${EXTENSION_RUNTIME_TARGETS.join(', ')}.`,
    );
  }

  const requestedTarget = requestedTargets?.[0];
  if (!requestedTarget) {
    return hostTarget;
  }
  if (!isExtensionRuntimeTarget(requestedTarget)) {
    throw new Error(
      `Unsupported extension runtime target: ${requestedTarget}. `
      + `Supported targets are ${EXTENSION_RUNTIME_TARGETS.join(', ')}.`,
    );
  }
  if (requestedTarget !== hostTarget) {
    throw new Error(
      `Cannot stage ${requestedTarget} native files on ${hostTarget}. `
      + 'Build the VSIX on its matching host.',
    );
  }

  return requestedTarget;
}

const TREE_SITTER_GRAMMAR_PACKAGE_NAMES = [
  'tree-sitter-c',
  'tree-sitter-cpp',
  'tree-sitter-c-sharp',
  '@driftlog/tree-sitter-dart',
  'tree-sitter-go',
  'tree-sitter-haskell',
  'tree-sitter-java',
  'tree-sitter-javascript',
  '@tree-sitter-grammars/tree-sitter-kotlin',
  '@tree-sitter-grammars/tree-sitter-lua',
  'tree-sitter-objc',
  'tree-sitter-php',
  'tree-sitter-python',
  'tree-sitter-ruby',
  'tree-sitter-rust',
  'tree-sitter-scala',
  'tree-sitter-swift',
  'tree-sitter-typescript',
] as const;

export const EXTENSION_RUNTIME_PACKAGE_NAMES = [
  'libsql',
  '@neon-rs/load',
  'detect-libc',
  'esbuild',
  'material-icon-theme',
  'node-gyp-build',
  'tree-sitter',
  ...TREE_SITTER_GRAMMAR_PACKAGE_NAMES,
] as const;

export type RuntimePackagePlan = {
  packageName: string;
  relativeFilePaths: string[];
  resolvePackageRootPath?: (packageName: string) => string;
};

function resolvePackageEntryPath(packageName: string): string {
  return require.resolve(packageName);
}

export function resolveRuntimePackageRootPath(
  packageName: string,
  resolveEntryPath: (packageName: string) => string = resolvePackageEntryPath,
): string {
  let currentPath = path.dirname(resolveEntryPath(packageName));

  while (!fs.existsSync(path.join(currentPath, 'package.json'))) {
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      throw new Error(`Unable to find package root for ${packageName}`);
    }
    currentPath = parentPath;
  }

  return currentPath;
}

function resolveEsbuildBinaryPackageRootPath(packageName: string): string {
  const manifestPath = require.resolve(`${packageName}/package.json`, {
    paths: [require.resolve('esbuild')],
  });
  return path.dirname(manifestPath);
}

function resolveParcelWatcherBinaryPackageRootPath(packageName: string): string {
  const requireFromCore = createRequire(require.resolve('@codegraphy-dev/core'));
  const watcherEntryPath = requireFromCore.resolve('@parcel/watcher');
  const manifestPath = requireFromCore.resolve(`${packageName}/package.json`, {
    paths: [path.dirname(watcherEntryPath)],
  });
  return path.dirname(manifestPath);
}

function listRelativeFiles(
  packageRootPath: string,
  relativeDirectoryPath: string,
): string[] {
  const directoryPath = path.join(packageRootPath, relativeDirectoryPath);
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  return fs.readdirSync(directoryPath, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.relative(packageRootPath, path.join(entry.parentPath, entry.name))
      .split(path.sep)
      .join('/'));
}

function legalFilePaths(packageRootPath: string): string[] {
  return fs.readdirSync(packageRootPath, { withFileTypes: true })
    .filter(entry => entry.isFile() && /^(?:licen[cs]e|notice)(?:\.|$)/i.test(entry.name))
    .map(entry => entry.name);
}

function staticPackagePlan(
  packageName: string,
  relativeFilePaths: readonly string[],
  resolvePackageRootPath?: (packageName: string) => string,
): RuntimePackagePlan {
  const packageRootPath = (resolvePackageRootPath ?? resolveRuntimePackageRootPath)(packageName);
  return {
    packageName,
    relativeFilePaths: [...relativeFilePaths, ...legalFilePaths(packageRootPath)],
    ...(resolvePackageRootPath ? { resolvePackageRootPath } : {}),
  };
}

function treeSitterGrammarPlan(
  packageName: string,
  nativePrebuildDirectory: string,
): RuntimePackagePlan {
  const packageRootPath = resolveRuntimePackageRootPath(packageName);
  const bindingFilePaths = listRelativeFiles(packageRootPath, 'bindings/node')
    .filter(filePath => filePath.endsWith('.js') && !filePath.endsWith('_test.js'));
  const nodeTypeFilePaths = listRelativeFiles(packageRootPath, '')
    .filter(filePath => filePath.endsWith('src/node-types.json'));
  const prebuildFilePaths = listRelativeFiles(
    packageRootPath,
    path.join('prebuilds', nativePrebuildDirectory),
  ).filter(filePath => filePath.endsWith('.node'));
  const builtFilePaths = packageName === '@driftlog/tree-sitter-dart'
    ? listRelativeFiles(packageRootPath, path.join('build', 'Release'))
      .filter(filePath => filePath.endsWith('.node'))
    : [];
  const rootEntrypointFilePaths = packageName === '@driftlog/tree-sitter-dart'
    ? ['index.js']
    : [];
  const nativeFilePaths = [...prebuildFilePaths, ...builtFilePaths];

  if (nativeFilePaths.length === 0) {
    throw new Error(`No ${nativePrebuildDirectory} native binding found for ${packageName}.`);
  }

  return staticPackagePlan(packageName, [
    'package.json',
    ...rootEntrypointFilePaths,
    ...bindingFilePaths,
    ...nodeTypeFilePaths,
    ...nativeFilePaths,
  ]);
}

export function getExtensionRuntimePackageNames(
  target: ExtensionRuntimeTarget,
): string[] {
  const config = RUNTIME_TARGET_CONFIG[target];
  return [
    ...EXTENSION_RUNTIME_PACKAGE_NAMES,
    config.libsqlPackageName,
    config.esbuildPackageName,
    config.parcelWatcherPackageName,
  ];
}

export function createRuntimePackagePlans(
  target: ExtensionRuntimeTarget,
): RuntimePackagePlan[] {
  const config = RUNTIME_TARGET_CONFIG[target];
  const materialIconThemeRoot = resolveRuntimePackageRootPath('material-icon-theme');

  return [
    staticPackagePlan('libsql', [
      'package.json',
      'index.js',
      'auth.js',
      'promise.js',
      'sqlite-error.js',
    ]),
    staticPackagePlan('@neon-rs/load', ['package.json', 'dist/index.js']),
    staticPackagePlan('detect-libc', [
      'package.json',
      'lib/detect-libc.js',
      'lib/filesystem.js',
      'lib/process.js',
    ]),
    staticPackagePlan('esbuild', [
      'package.json',
      'lib/main.js',
    ]),
    staticPackagePlan(config.esbuildPackageName, [
      'package.json',
      config.platform === 'win32' ? 'esbuild.exe' : 'bin/esbuild',
    ], resolveEsbuildBinaryPackageRootPath),
    staticPackagePlan(config.libsqlPackageName, ['package.json', 'index.node']),
    staticPackagePlan(
      config.parcelWatcherPackageName,
      ['package.json', 'watcher.node'],
      resolveParcelWatcherBinaryPackageRootPath,
    ),
    staticPackagePlan('material-icon-theme', [
      'package.json',
      'dist/material-icons.json',
      ...listRelativeFiles(materialIconThemeRoot, 'icons'),
    ]),
    staticPackagePlan('node-gyp-build', [
      'package.json',
      'index.js',
      'node-gyp-build.js',
    ]),
    staticPackagePlan('tree-sitter', [
      'package.json',
      'index.js',
      path.join(
        'prebuilds',
        config.nativePrebuildDirectory,
        'tree-sitter.node',
      ),
    ]),
    ...TREE_SITTER_GRAMMAR_PACKAGE_NAMES.map(packageName => treeSitterGrammarPlan(
      packageName,
      config.nativePrebuildDirectory,
    )),
  ];
}

export function getVendoredPackageRootPath(
  outputFilePath: string,
  packageName: string,
): string {
  return path.join(path.dirname(outputFilePath), 'node_modules', ...packageName.split('/'));
}

function toPackageRelativeEntrypoint(entrypoint: string): string {
  return entrypoint.endsWith('/')
    ? `${entrypoint}index.js`
    : `${entrypoint}/index.js`;
}

function normalizeVendoredPackageEntrypoint(packageRootPath: string): void {
  const manifestPath = path.join(packageRootPath, 'package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    main?: unknown;
    [key: string]: unknown;
  };
  if (typeof manifest.main !== 'string' || path.extname(manifest.main) !== '') {
    return;
  }

  const normalizedMain = toPackageRelativeEntrypoint(manifest.main);
  if (!fs.existsSync(path.join(packageRootPath, normalizedMain))) {
    return;
  }

  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({ ...manifest, main: normalizedMain }, null, 2)}\n`,
  );
}

export function copyRuntimePackage(
  outputFilePath: string,
  packageName: string,
  relativeFilePaths: readonly string[],
  resolvePackageRootPath: (packageName: string) => string = resolveRuntimePackageRootPath,
): string {
  const sourcePath = resolvePackageRootPath(packageName);
  const targetPath = getVendoredPackageRootPath(outputFilePath, packageName);

  fs.rmSync(targetPath, { recursive: true, force: true });

  for (const relativeFilePath of [...new Set(relativeFilePaths)]) {
    const sourceFilePath = path.join(sourcePath, relativeFilePath);
    if (!fs.existsSync(sourceFilePath) || !fs.statSync(sourceFilePath).isFile()) {
      throw new Error(`Runtime package file is not a file: ${packageName}/${relativeFilePath}`);
    }

    const targetFilePath = path.join(targetPath, relativeFilePath);
    fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
    fs.cpSync(sourceFilePath, targetFilePath, { force: true });
  }

  normalizeVendoredPackageEntrypoint(targetPath);
  return targetPath;
}

export function syncExtensionRuntimePackages(
  outputFilePath: string,
  target: ExtensionRuntimeTarget = resolveExtensionRuntimeTarget(),
): string[] {
  fs.rmSync(path.join(path.dirname(outputFilePath), 'node_modules'), {
    recursive: true,
    force: true,
  });

  return createRuntimePackagePlans(target).map(plan => copyRuntimePackage(
    outputFilePath,
    plan.packageName,
    plan.relativeFilePaths,
    plan.resolvePackageRootPath,
  ));
}
