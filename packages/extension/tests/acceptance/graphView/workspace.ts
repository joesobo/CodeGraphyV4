import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { minimatch } from 'minimatch';
import { DEFAULT_EXCLUDE_PATTERNS } from '../../../src/extension/config/defaults';
import { acceptancePluginPackageRelativePathsForExample } from './plugins';

const EXAMPLES_WITH_ASSERTED_VSCODE_SETTINGS = new Set([
  'example-csharp',
  'example-godot',
  'example-python',
]);

interface CopyExampleWorkspaceOptions {
  includeCallEdges?: boolean;
  includeInheritEdges?: boolean;
  filterPatterns?: string[];
  includeVSCodeSettings?: boolean;
  includeTypeImportEdges?: boolean;
  pluginPackages?: string[];
}

interface AcceptanceFilterSettings {
  disabledCustomFilterPatterns: string[];
  disabledPluginFilterPatterns: string[];
  filterPatterns: string[];
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

  fs.cpSync(sourcePath, workspacePath, {
    recursive: true,
    filter: (source) => {
      const relativePath = path.relative(sourcePath, source).split(path.sep).join('/');
      return !isAcceptanceGeneratedArtifact(relativePath)
        && relativePath !== '.codegraphy/graph.lbug'
        && relativePath !== '.codegraphy/meta.json';
    },
  });
  rewriteMarkdownAcceptanceLinks(workspacePath, exampleName);
  writeAcceptanceVSCodeSettings(workspacePath, exampleName, options);
  writeAcceptanceSettings(workspacePath, options);

  return workspacePath;
}

export async function readExampleWorkspaceFiles(
  workspacePath: string,
  exampleName?: string,
): Promise<string[]> {
  const settings = readAcceptanceFilterSettings(workspacePath);
  const disabledCustomPatterns = new Set(settings.disabledCustomFilterPatterns);
  const disabledPluginPatterns = new Set(settings.disabledPluginFilterPatterns);
  const filterPatterns = settings.filterPatterns
    .filter(pattern => !disabledCustomPatterns.has(pattern));
  const pluginFilterPatterns = readAcceptancePluginFilterPatterns(exampleName)
    .filter(pattern => !disabledPluginPatterns.has(pattern));
  const excludePatterns = [
    ...DEFAULT_EXCLUDE_PATTERNS,
    ...pluginFilterPatterns,
    ...filterPatterns,
  ];

  return collectFiles(workspacePath)
    .filter(filePath => !matchesAcceptancePattern(filePath, excludePatterns))
    .sort();
}

function collectFiles(root: string, current = root): string[] {
  return fs.readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(current, entry.name);
    const relativePath = path.relative(root, absolutePath).split(path.sep).join('/');

    if (entry.isDirectory()) {
      return collectFiles(root, absolutePath);
    }

    return [relativePath];
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
      .map(pluginPackage => ({ package: pluginPackage })),
    filterPatterns: options.filterPatterns ?? [],
    edgeVisibility: {
      nests: false,
      import: true,
      'type-import': options.includeTypeImportEdges ?? false,
      reexport: false,
      call: options.includeCallEdges ?? false,
      inherit: options.includeInheritEdges ?? true,
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
    };

    return {
      disabledCustomFilterPatterns: readStringArray(settings.disabledCustomFilterPatterns),
      disabledPluginFilterPatterns: readStringArray(settings.disabledPluginFilterPatterns),
      filterPatterns: readStringArray(settings.filterPatterns),
    };
  } catch {
    return {
      disabledCustomFilterPatterns: [],
      disabledPluginFilterPatterns: [],
      filterPatterns: [],
    };
  }
}

function readAcceptancePluginFilterPatterns(exampleName: string | undefined): string[] {
  return acceptancePluginPackageRelativePathsForExample(exampleName).flatMap((relativePath) => {
    try {
      const manifest = JSON.parse(
        fs.readFileSync(path.join(repoRoot(), relativePath, 'codegraphy.json'), 'utf8'),
      ) as { defaultFilters?: unknown };

      return Array.isArray(manifest.defaultFilters)
        ? manifest.defaultFilters.filter((pattern): pattern is string => typeof pattern === 'string')
        : [];
    } catch {
      return [];
    }
  });
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((pattern): pattern is string => typeof pattern === 'string')
    : [];
}

function matchesAcceptancePattern(relativePath: string, patterns: readonly string[]): boolean {
  return patterns.some(pattern =>
    minimatch(relativePath, pattern, { dot: true, matchBase: true })
  );
}

function isAcceptanceGeneratedArtifact(relativePath: string): boolean {
  return relativePath === 'node_modules'
    || relativePath.startsWith('node_modules/')
    || relativePath === 'dist'
    || relativePath.startsWith('dist/')
    || relativePath === '.turbo'
    || relativePath.startsWith('.turbo/');
}
