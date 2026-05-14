import { CORE_PLUGIN_API_VERSION } from './registry';

export type CodeGraphyPluginDisclosure =
  | 'network'
  | 'secrets'
  | 'externalProcesses'
  | 'workspaceWrites'
  | 'outsideWorkspaceWrites'
  | 'extraFileReads';

export interface CodeGraphyPluginPackageManifest {
  package: string;
  version: string;
  apiVersion: string;
  defaultOptions?: Record<string, unknown>;
  disclosures: CodeGraphyPluginDisclosure[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSemver(version: string): { major: number; minor: number; patch: number } | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) {
    return undefined;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareSemver(
  left: { major: number; minor: number; patch: number },
  right: { major: number; minor: number; patch: number },
): number {
  if (left.major !== right.major) return left.major - right.major;
  if (left.minor !== right.minor) return left.minor - right.minor;
  return left.patch - right.patch;
}

function satisfiesSemverRange(version: string, range: string): boolean {
  const target = parseSemver(version);
  if (!target) return false;

  const normalized = range.trim();
  if (/^\d+$/.test(normalized)) {
    return target.major === Number(normalized);
  }

  if (normalized.startsWith('^')) {
    const minimum = parseSemver(normalized.slice(1));
    if (!minimum) return false;
    const maximum = { major: minimum.major + 1, minor: 0, patch: 0 };
    return compareSemver(target, minimum) >= 0 && compareSemver(target, maximum) < 0;
  }

  const exact = parseSemver(normalized);
  return exact ? compareSemver(target, exact) === 0 : false;
}

function readDefaultOptions(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? { ...value } : undefined;
}

function readDisclosures(value: unknown): CodeGraphyPluginDisclosure[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is CodeGraphyPluginDisclosure =>
    entry === 'network'
    || entry === 'secrets'
    || entry === 'externalProcesses'
    || entry === 'workspaceWrites'
    || entry === 'outsideWorkspaceWrites'
    || entry === 'extraFileReads',
  );
}

export function parseCodeGraphyPluginPackageManifest(
  packageJson: unknown,
): CodeGraphyPluginPackageManifest | null {
  if (!isRecord(packageJson) || !isRecord(packageJson.codegraphy)) {
    return null;
  }

  const packageName = typeof packageJson.name === 'string' ? packageJson.name : '';
  const version = typeof packageJson.version === 'string' ? packageJson.version : '';
  const apiVersion = typeof packageJson.codegraphy.apiVersion === 'string'
    ? packageJson.codegraphy.apiVersion
    : '';

  if (
    packageName.length === 0
    || version.length === 0
    || packageJson.codegraphy.type !== 'plugin'
    || apiVersion.length === 0
  ) {
    return null;
  }

  if (!satisfiesSemverRange(CORE_PLUGIN_API_VERSION, apiVersion)) {
    throw new Error(
      `Plugin '${packageName}' targets unsupported CodeGraphy Plugin API '${apiVersion}'.`,
    );
  }

  const manifest: CodeGraphyPluginPackageManifest = {
    package: packageName,
    version,
    apiVersion,
    disclosures: readDisclosures(packageJson.codegraphy.disclosures),
  };
  const defaultOptions = readDefaultOptions(packageJson.codegraphy.defaultOptions);
  if (defaultOptions) {
    manifest.defaultOptions = defaultOptions;
  }

  return manifest;
}
