export const EXTENSION_RUNTIME_TARGETS = [
  'linux-x64',
  'darwin-arm64',
  'win32-x64',
] as const;

export type ExtensionRuntimeTarget = typeof EXTENSION_RUNTIME_TARGETS[number];

export type RuntimeTargetConfig = {
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
