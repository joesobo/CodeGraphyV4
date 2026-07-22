import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import {
  looseStringArraySchema,
  trimmedNonEmptyStringSchema,
  unknownRecordSchema,
} from '../shared/values';
import type { E2EScenario } from './scenarios';

interface CodeGraphyInstalledPluginRecord {
  package: string;
  version: string;
  apiVersion: string;
  packageRoot: string;
  defaultOptions?: Record<string, unknown>;
  disclosures: string[];
  pluginId: string;
  pluginName?: string;
  supportedExtensions?: string[];
}

interface CodeGraphyWorkspacePluginSettings {
  id: string;
  enabled: boolean;
  options?: Record<string, unknown>;
}

interface E2EWorkspaceSettings {
  version: 1;
  maxFiles: number;
  include: string[];
  respectGitignore: boolean;
  showOrphans: boolean;
  filterPatterns: string[];
  disabledCustomFilterPatterns: string[];
  plugins: CodeGraphyWorkspacePluginSettings[];
}

const CODEGRAPHY_MARKDOWN_PLUGIN_ID = 'codegraphy.markdown';
const DEFAULT_MAX_FILES = 1000;
const DEFAULT_INCLUDE = ['**/*'];

const workspaceSettingsShapeSchema = z.looseObject({
  maxFiles: z.number().optional().catch(undefined),
  include: z.unknown(),
  respectGitignore: z.boolean().optional().catch(undefined),
  showOrphans: z.boolean().optional().catch(undefined),
  filterPatterns: z.unknown(),
  disabledCustomFilterPatterns: z.unknown(),
  plugins: z.array(z.unknown()),
});

const workspacePluginShapeSchema = z.looseObject({
  id: z.unknown(),
  package: z.unknown(),
  enabled: z.boolean().optional().catch(undefined),
  options: unknownRecordSchema.optional().catch(undefined),
});

const scenarioPackageJsonSchema = z.looseObject({
  name: z.string().catch(''),
  version: z.string().catch(''),
  codegraphy: z.looseObject({
    type: z.unknown(),
    apiVersion: z.string().catch(''),
    disclosures: z.unknown(),
    defaultOptions: unknownRecordSchema.optional().catch(undefined),
  }),
});

function readTrimmedOptionalString(value: unknown): string | undefined {
  const parsed = trimmedNonEmptyStringSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function readScenarioPackageDescriptor(
  packageRoot: string,
): Pick<CodeGraphyInstalledPluginRecord, 'pluginId' | 'pluginName' | 'supportedExtensions'> {
  const descriptorPath = path.join(packageRoot, 'codegraphy.json');
  const descriptor = unknownRecordSchema.safeParse(
    JSON.parse(fs.readFileSync(descriptorPath, 'utf-8')),
  );
  if (!descriptor.success) {
    throw new Error(`E2E scenario package has invalid codegraphy.json: ${packageRoot}`);
  }

  const pluginId = readTrimmedOptionalString(descriptor.data.id);
  if (!pluginId) {
    throw new Error(`E2E scenario package is missing codegraphy.json id: ${packageRoot}`);
  }

  const pluginName = readTrimmedOptionalString(descriptor.data.name);
  const supportedExtensions = looseStringArraySchema.parse(descriptor.data.supportedExtensions);
  return {
    pluginId,
    ...(pluginName ? { pluginName } : {}),
    ...(supportedExtensions.length > 0 ? { supportedExtensions } : {}),
  };
}

function readScenarioPackageRecord(packageRoot: string): CodeGraphyInstalledPluginRecord {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const packageJson = scenarioPackageJsonSchema.safeParse(
    JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')),
  );
  if (!packageJson.success) {
    throw new Error(`E2E scenario package is not a CodeGraphy plugin: ${packageRoot}`);
  }

  const { name: packageName, version, codegraphy } = packageJson.data;
  if (
    packageName.length === 0
    || version.length === 0
    || codegraphy.type !== 'plugin'
    || codegraphy.apiVersion.length === 0
  ) {
    throw new Error(`E2E scenario package is not a CodeGraphy plugin: ${packageRoot}`);
  }

  const plugin: CodeGraphyInstalledPluginRecord = {
    package: packageName,
    version,
    apiVersion: codegraphy.apiVersion,
    packageRoot,
    disclosures: looseStringArraySchema.parse(codegraphy.disclosures),
    ...readScenarioPackageDescriptor(packageRoot),
  };
  if (codegraphy.defaultOptions) {
    plugin.defaultOptions = { ...codegraphy.defaultOptions };
  }

  return plugin;
}

function createInitialWorkspaceSettings(
  plugins: readonly CodeGraphyInstalledPluginRecord[],
): E2EWorkspaceSettings {
  return {
    version: 1,
    maxFiles: DEFAULT_MAX_FILES,
    include: DEFAULT_INCLUDE,
    respectGitignore: true,
    showOrphans: true,
    filterPatterns: [],
    disabledCustomFilterPatterns: [],
    plugins: [
      { id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, enabled: true },
      ...plugins.map(createWorkspacePluginSettings),
    ],
  };
}

function writeInstalledPluginCache(
  homeDir: string,
  plugins: CodeGraphyInstalledPluginRecord[],
): void {
  const userDirectoryPath = path.join(homeDir, '.codegraphy');
  fs.mkdirSync(userDirectoryPath, { recursive: true });
  fs.writeFileSync(
    path.join(userDirectoryPath, 'plugins.json'),
    `${JSON.stringify({ version: 1, plugins }, null, 2)}\n`,
  );
}

function readWorkspaceSettingsOrInitial(workspacePath: string): E2EWorkspaceSettings {
  const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');
  if (!fs.existsSync(settingsPath)) {
    return createInitialWorkspaceSettings([]);
  }

  const parsed = workspaceSettingsShapeSchema.safeParse(
    JSON.parse(fs.readFileSync(settingsPath, 'utf-8')),
  );
  if (!parsed.success) {
    return createInitialWorkspaceSettings([]);
  }

  const settings = parsed.data;
  const include = looseStringArraySchema.parse(settings.include);
  return {
    version: 1,
    maxFiles: settings.maxFiles ?? DEFAULT_MAX_FILES,
    include: include.length > 0 ? include : DEFAULT_INCLUDE,
    respectGitignore: settings.respectGitignore ?? true,
    showOrphans: settings.showOrphans ?? true,
    filterPatterns: looseStringArraySchema.parse(settings.filterPatterns),
    disabledCustomFilterPatterns: looseStringArraySchema.parse(settings.disabledCustomFilterPatterns),
    plugins: settings.plugins
      .map(entry => workspacePluginShapeSchema.safeParse(entry))
      .filter(result => result.success)
      .map((result): CodeGraphyWorkspacePluginSettings | null => {
        const plugin = result.data;
        const pluginId = readTrimmedOptionalString(plugin.id)
          ?? readTrimmedOptionalString(plugin.package);
        if (!pluginId) {
          return null;
        }

        const normalized: CodeGraphyWorkspacePluginSettings = {
          id: pluginId,
          enabled: plugin.enabled ?? true,
        };
        if (plugin.options) {
          normalized.options = { ...plugin.options };
        }
        return normalized;
      })
      .filter((plugin): plugin is CodeGraphyWorkspacePluginSettings => plugin !== null),
  };
}

function writeWorkspaceSettings(workspacePath: string, settings: E2EWorkspaceSettings): void {
  const settingsPath = path.join(workspacePath, '.codegraphy/settings.json');
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`);
}

function createWorkspacePluginSettings(
  plugin: CodeGraphyInstalledPluginRecord,
): CodeGraphyWorkspacePluginSettings {
  const settings: CodeGraphyWorkspacePluginSettings = {
    id: plugin.pluginId,
    enabled: true,
  };
  if (plugin.defaultOptions && Object.keys(plugin.defaultOptions).length > 0) {
    settings.options = { ...plugin.defaultOptions };
  }

  return settings;
}

export function prepareScenarioWorkspacePlugins(
  scenario: E2EScenario,
  repoRoot: string,
  workspacePath: string,
  homeDir: string,
  shouldWriteWorkspaceSettings = true,
): void {
  const plugins = scenario.workspacePluginPackageRelativePaths
    .map(relativePath => readScenarioPackageRecord(path.resolve(repoRoot, relativePath)));

  writeInstalledPluginCache(homeDir, plugins);

  if (!shouldWriteWorkspaceSettings || plugins.length === 0) {
    return;
  }

  const settings = readWorkspaceSettingsOrInitial(workspacePath);
  const enabledPluginIds = new Set(settings.plugins.map(plugin => plugin.id));
  writeWorkspaceSettings(workspacePath, {
    ...settings,
    plugins: [
      ...settings.plugins,
      ...plugins
        .filter(plugin => !enabledPluginIds.has(plugin.pluginId))
        .map(createWorkspacePluginSettings),
    ],
  });
}
