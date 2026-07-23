import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ignore, { type Ignore } from 'ignore';
import {
  looseStringArraySchema,
  unknownRecordSchema,
} from '../../../src/shared/values';
import { DEFAULT_INCLUDE, DEFAULT_MAX_FILES } from '../../../../core/src/discovery/file/defaults';
import {
  DEFAULT_EXCLUDE,
  matchesAnyPattern,
  normalizeDiscoveryPath,
  shouldSkipKnownDirectory,
} from '@codegraphy-dev/core';

const EXAMPLES_WITH_ASSERTED_VSCODE_SETTINGS = new Set([
  'example-csharp',
  'example-godot',
  'example-python',
]);

interface CopyExampleWorkspaceOptions {
  includeImportEdges?: boolean;
  includeNestsEdges?: boolean;
  includeVSCodeSettings?: boolean;
  includeTypeImportEdges?: boolean;
  pluginPackages?: string[];
}

interface AcceptanceFilterSettings {
  disabledCustomFilterPatterns: string[];
  disabledPluginFilterPatterns: string[];
  filterPatterns: string[];
  include: string[];
  maxFiles: number;
  plugins: Array<{
    disabledFilterPatterns?: string[];
    enabled: boolean;
    packageName: string;
  }>;
  respectGitignore: boolean;
}

export function createWorkspaceTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-workspace-'));
}

export function repoRoot(): string {
  return path.resolve(__dirname, '../../../../..');
}

export function extensionRoot(): string {
  return path.resolve(repoRoot(), 'packages/extension');
}

export function copyExampleTypescriptWorkspace(
  tempRoot: string,
  options: CopyExampleWorkspaceOptions = {},
): string {
  return copyExampleWorkspace(tempRoot, 'example-typescript', options);
}

export function copyExampleWorkspace(
  tempRoot: string,
  exampleName: string,
  options: CopyExampleWorkspaceOptions = {},
): string {
  const sourcePath = path.join(repoRoot(), 'examples', exampleName);
  const workspacePath = path.join(tempRoot, exampleName);
  const copyFilter = createAcceptanceWorkspaceCopyFilter(sourcePath);

  fs.cpSync(sourcePath, workspacePath, {
    recursive: true,
    filter: copyFilter,
  });
  rewriteMarkdownAcceptanceLinks(workspacePath, exampleName);
  writeAcceptanceVSCodeSettings(workspacePath, exampleName, options);
  if (hasAcceptanceSettingsOverrides(options)) {
    writeAcceptanceSettings(workspacePath, options);
  }

  return workspacePath;
}

export function createAcceptanceWorkspaceCopyFilter(workspaceRoot: string): (sourcePath: string) => boolean {
  const gitignore = loadGitignore(workspaceRoot);

  return (sourcePath: string): boolean => {
    const relativePath = normalizeCopyPath(path.relative(workspaceRoot, sourcePath));
    if (relativePath.length === 0) {
      return true;
    }

    if (relativePath === '.codegraphy/settings.json') {
      return true;
    }

    if (isAcceptanceGeneratedArtifact(relativePath)
      || relativePath === '.codegraphy/graph.sqlite'
      || relativePath === '.codegraphy/meta.json') {
      return false;
    }

    if (!gitignore) {
      return true;
    }

    const isDirectory = fs.statSync(sourcePath).isDirectory();
    return !gitignore.ignores(relativePath)
      && !(isDirectory && gitignore.ignores(`${relativePath}/`));
  };
}

function hasAcceptanceSettingsOverrides(options: CopyExampleWorkspaceOptions): boolean {
  return options.includeImportEdges !== undefined
    || options.includeNestsEdges !== undefined
    || options.includeTypeImportEdges !== undefined
    || options.pluginPackages !== undefined;
}

export async function readExampleWorkspaceFiles(workspacePath: string): Promise<string[]> {
  const settings = readAcceptanceFilterSettings(workspacePath);
  const disabledCustomPatterns = new Set(settings.disabledCustomFilterPatterns);
  const disabledPluginPatterns = new Set([
    ...settings.plugins.flatMap(plugin => plugin.disabledFilterPatterns ?? []),
    ...settings.disabledPluginFilterPatterns,
  ]);
  const filterPatterns = settings.filterPatterns
    .filter(pattern => !disabledCustomPatterns.has(pattern));
  const pluginFilterPatterns = readAcceptancePluginFilterPatterns(
    settings.plugins
      .filter(plugin => plugin.enabled)
      .map(plugin => plugin.packageName),
  )
    .filter(pattern => !disabledPluginPatterns.has(pattern));

  return discoverAcceptanceWorkspaceFiles(workspacePath, {
    excludePatterns: [
      ...new Set([
        ...DEFAULT_EXCLUDE,
        ...pluginFilterPatterns,
        ...filterPatterns,
      ]),
    ],
    includePatterns: settings.include,
    maxFiles: settings.maxFiles,
    respectGitignore: settings.respectGitignore,
  });
}

function rewriteMarkdownAcceptanceLinks(workspacePath: string, exampleName: string): void {
  if (exampleName !== 'example-markdown') {
    return;
  }

  for (const relativePath of ['notes/Home.md', 'src/commented.ts']) {
    const filePath = path.join(workspacePath, relativePath);
    const content = fs.readFileSync(filePath, 'utf8');
    fs.writeFileSync(
      filePath,
      content
        .replace(/example-markdown\/notes\/Architecture\.md/g, 'notes/Architecture.md')
        .replace(/example-markdown\/notes\/assets\/Diagram\.md/g, 'notes/assets/Diagram.md')
        .replace(/example-markdown\/src\/commented\.ts/g, 'src/commented.ts'),
    );
  }
}

function writeAcceptanceVSCodeSettings(
  workspacePath: string,
  exampleName: string,
  options: CopyExampleWorkspaceOptions,
): void {
  const includeSettings = options.includeVSCodeSettings ?? EXAMPLES_WITH_ASSERTED_VSCODE_SETTINGS.has(exampleName);

  if (!includeSettings) {
    return;
  }

  const targetSettingsPath = path.join(workspacePath, '.vscode/settings.json');
  fs.mkdirSync(path.dirname(targetSettingsPath), { recursive: true });
  fs.writeFileSync(targetSettingsPath, '{}\n');
}

function writeAcceptanceSettings(workspacePath: string, options: CopyExampleWorkspaceOptions): void {
  const targetSettingsPath = path.join(workspacePath, '.codegraphy/settings.json');
  const settings = {
    version: 1,
    respectGitignore: false,
    plugins: (options.pluginPackages ?? ['@codegraphy-dev/plugin-markdown'])
      .map(pluginPackage => ({
        id: acceptancePluginIdForPackage(pluginPackage),
        enabled: true,
      })),
    filterPatterns: [],
    edgeVisibility: {
      nests: options.includeNestsEdges ?? false,
      import: options.includeImportEdges ?? true,
      'type-import': options.includeTypeImportEdges ?? false,
      reexport: false,
      call: false,
      inherit: true,
      reference: true,
      test: false,
      load: true,
      contains: false,
      overrides: false,
    },
  };

  fs.mkdirSync(path.dirname(targetSettingsPath), { recursive: true });
  fs.writeFileSync(targetSettingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}

function readAcceptanceFilterSettings(workspacePath: string): AcceptanceFilterSettings {
  try {
    const settings = JSON.parse(
      fs.readFileSync(path.join(workspacePath, '.codegraphy/settings.json'), 'utf8'),
    ) as {
      disabledCustomFilterPatterns?: unknown;
      disabledPluginFilterPatterns?: unknown;
      filterPatterns?: unknown;
      include?: unknown;
      maxFiles?: unknown;
      plugins?: unknown;
      respectGitignore?: unknown;
    };
    const include = readUniqueStringArray(settings.include);

    return {
      disabledCustomFilterPatterns: readUniqueStringArray(settings.disabledCustomFilterPatterns),
      disabledPluginFilterPatterns: readUniqueStringArray(settings.disabledPluginFilterPatterns),
      filterPatterns: readUniqueStringArray(settings.filterPatterns),
      include: include.length > 0 ? include : [...DEFAULT_INCLUDE],
      maxFiles: readMaxFiles(settings.maxFiles),
      plugins: readAcceptancePluginSettings(settings.plugins),
      respectGitignore: typeof settings.respectGitignore === 'boolean'
        ? settings.respectGitignore
        : true,
    };
  } catch {
    return {
      disabledCustomFilterPatterns: [],
      disabledPluginFilterPatterns: [],
      filterPatterns: [],
      include: [...DEFAULT_INCLUDE],
      maxFiles: DEFAULT_MAX_FILES,
      plugins: [],
      respectGitignore: true,
    };
  }
}

function readAcceptancePluginFilterPatterns(pluginPackages: readonly string[]): string[] {
  return pluginPackages.flatMap((pluginPackage) => {
    const relativePath = acceptancePluginPackageRelativePathForPackage(pluginPackage);
    if (!relativePath) {
      return [];
    }

    try {
      const manifest = readAcceptancePluginDescriptor(relativePath);
      const metadata = unknownRecordSchema.safeParse(manifest?.data);
      const defaultFilters = metadata.success ? metadata.data.defaultFilters : undefined;

      return Array.isArray(defaultFilters)
        ? defaultFilters.filter((pattern): pattern is string => typeof pattern === 'string')
        : [];
    } catch {
      return [];
    }
  });
}

function acceptancePluginIdForPackage(pluginPackage: string): string {
  const relativePath = acceptancePluginPackageRelativePathForPackage(pluginPackage);
  if (!relativePath) {
    return pluginPackage;
  }

  try {
    const manifest = readAcceptancePluginDescriptor(relativePath);
    return typeof manifest?.id === 'string' && manifest.id.trim().length > 0
      ? manifest.id.trim()
      : pluginPackage;
  } catch {
    return pluginPackage;
  }
}

function acceptancePluginPackageForId(pluginId: string): string | undefined {
  const packagesPath = path.join(repoRoot(), 'packages');
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(packagesPath, { withFileTypes: true });
  } catch {
    return undefined;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('plugin-')) {
      continue;
    }

    const relativePath = path.posix.join('packages', entry.name);
    try {
      const manifest = readAcceptancePluginDescriptor(relativePath);
      if (manifest?.id !== pluginId) {
        continue;
      }

      const packageJson = JSON.parse(
        fs.readFileSync(path.join(repoRoot(), relativePath, 'package.json'), 'utf8'),
      ) as { name?: unknown };
      return typeof packageJson.name === 'string' ? packageJson.name : undefined;
    } catch {
      // Ignore incomplete plugin packages in test fixtures.
    }
  }

  return undefined;
}

function readAcceptancePluginDescriptor(
  relativePath: string,
): { id?: unknown; data?: unknown } | undefined {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repoRoot(), relativePath, 'package.json'), 'utf8'),
  ) as {
    codegraphy?: {
      plugins?: Array<{ id?: unknown; data?: unknown }>;
    };
  };
  return packageJson.codegraphy?.plugins?.[0];
}

function acceptancePluginPackageRelativePathForPackage(pluginPackage: string): string | undefined {
  const packagesPath = path.join(repoRoot(), 'packages');
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(packagesPath, { withFileTypes: true });
  } catch {
    return undefined;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !entry.name.startsWith('plugin-')) {
      continue;
    }

    const relativePath = path.posix.join('packages', entry.name);
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(repoRoot(), relativePath, 'package.json'), 'utf8'),
      ) as { name?: unknown };
      if (packageJson.name === pluginPackage) {
        return relativePath;
      }
    } catch {
      // Ignore incomplete plugin packages in test fixtures.
    }
  }

  return undefined;
}

function readAcceptancePluginSettings(value: unknown): AcceptanceFilterSettings['plugins'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(entry => unknownRecordSchema.safeParse(entry))
    .filter(result => result.success)
    .map(result => result.data)
    .map((entry) => {
      const packageName = typeof entry.package === 'string'
        ? entry.package.trim()
        : typeof entry.id === 'string'
          ? acceptancePluginPackageForId(entry.id.trim()) ?? ''
          : '';
      if (packageName.length === 0) {
        return undefined;
      }

      const disabledFilterPatterns = readUniqueStringArray(entry.disabledFilterPatterns);
      return {
        enabled: entry.enabled !== false,
        packageName,
        ...(disabledFilterPatterns.length > 0
          ? { disabledFilterPatterns: [...new Set(disabledFilterPatterns)] }
          : {}),
      };
    })
    .filter((entry): entry is AcceptanceFilterSettings['plugins'][number] => entry !== undefined);
}

function readUniqueStringArray(value: unknown): string[] {
  return [...new Set(looseStringArraySchema.parse(value))];
}

function readMaxFiles(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : DEFAULT_MAX_FILES;
}

function normalizeCopyPath(relativePath: string): string {
  return relativePath.split(path.sep).join('/');
}

interface AcceptanceDiscoveryOptions {
  excludePatterns: string[];
  includePatterns: string[];
  maxFiles: number;
  respectGitignore: boolean;
}

async function discoverAcceptanceWorkspaceFiles(
  workspacePath: string,
  options: AcceptanceDiscoveryOptions,
): Promise<string[]> {
  const gitignore = options.respectGitignore ? loadGitignore(workspacePath) : null;
  const files: string[] = [];

  await walkAcceptanceDirectory(workspacePath, workspacePath, (relativePath, absolutePath) => {
    if (files.length >= options.maxFiles) {
      return false;
    }

    const normalizedPath = normalizeDiscoveryPath(relativePath);
    if (gitignore?.ignores(normalizedPath)) {
      return true;
    }

    if (matchesAnyPattern(normalizedPath, options.excludePatterns)) {
      return true;
    }

    if (!matchesAnyPattern(normalizedPath, options.includePatterns)) {
      return true;
    }

    if (fs.statSync(absolutePath).isFile()) {
      files.push(normalizedPath);
    }

    return true;
  });

  return files.sort();
}

function loadGitignore(rootPath: string): Ignore | null {
  const gitignorePath = path.join(rootPath, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    return null;
  }

  const gitignore = ignore();
  gitignore.add(fs.readFileSync(gitignorePath, 'utf-8'));
  return gitignore;
}

async function walkAcceptanceDirectory(
  workspacePath: string,
  currentPath: string,
  onFile: (relativePath: string, absolutePath: string) => boolean,
): Promise<boolean> {
  let entries: fs.Dirent[];

  try {
    entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
  } catch {
    return true;
  }

  for (const entry of entries) {
    const absolutePath = path.join(currentPath, entry.name);
    const relativePath = path.relative(workspacePath, absolutePath);

    if (entry.isDirectory()) {
      if (shouldSkipKnownDirectory(relativePath)) {
        continue;
      }

      if (!await walkAcceptanceDirectory(workspacePath, absolutePath, onFile)) {
        return false;
      }
      continue;
    }

    if (entry.isFile() && !onFile(relativePath, absolutePath)) {
      return false;
    }
  }

  return true;
}

function isAcceptanceGeneratedArtifact(relativePath: string): boolean {
  return relativePath === 'node_modules'
    || relativePath.startsWith('node_modules/')
    || relativePath === 'dist'
    || relativePath.startsWith('dist/')
    || relativePath === '.turbo'
    || relativePath.startsWith('.turbo/');
}
