import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import {
  parseCodeGraphyPluginPackageManifest,
  type CodeGraphyInstalledPluginRecord,
} from '@codegraphy-dev/core';
import {
  looseStringArraySchema,
  trimmedNonEmptyStringSchema,
  unknownRecordSchema,
} from '../shared/values';
import type { E2EScenario } from './scenarios';

interface E2EInstalledPluginRecord extends CodeGraphyInstalledPluginRecord {
  defaultOptions?: Record<string, unknown>;
  supportedExtensions?: string[];
}

interface CodeGraphyWorkspacePluginSettings {
  id: string;
  activation: 'enabled';
  options?: Record<string, unknown>;
}

interface E2EWorkspaceSettings {
  version: 1;
  maxFiles: number;
  include: string[];
  respectGitignore: boolean;
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
  filterPatterns: z.unknown(),
  disabledCustomFilterPatterns: z.unknown(),
  plugins: z.array(z.unknown()),
});

const workspacePluginShapeSchema = z.looseObject({
  id: z.unknown(),
  package: z.unknown(),
  activation: z.enum(['enabled']).optional().catch(undefined),
  options: unknownRecordSchema.optional().catch(undefined),
});

function readTrimmedOptionalString(value: unknown): string | undefined {
  const parsed = trimmedNonEmptyStringSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function readScenarioPackageDescriptor(
  data: unknown,
): Pick<E2EInstalledPluginRecord, 'supportedExtensions'> & { defaultOptions?: Record<string, unknown> } {
  const descriptor = unknownRecordSchema.safeParse(data);
  if (!descriptor.success) {
    return {};
  }

  const supportedExtensions = looseStringArraySchema.parse(descriptor.data.supportedExtensions);
  const defaultOptions = unknownRecordSchema.safeParse(descriptor.data.defaultOptions);
  return {
    ...(supportedExtensions.length > 0 ? { supportedExtensions } : {}),
    ...(defaultOptions.success ? { defaultOptions: { ...defaultOptions.data } } : {}),
  };
}

function readScenarioPackageRecords(packageRoot: string): E2EInstalledPluginRecord[] {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const manifest = parseCodeGraphyPluginPackageManifest(
    JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')),
  );
  if (!manifest) {
    throw new Error(`E2E scenario package is not a CodeGraphy plugin: ${packageRoot}`);
  }

  return manifest.plugins.map((descriptor): E2EInstalledPluginRecord => ({
      package: manifest.package,
      version: manifest.version,
      packageRoot,
      globallyEnabled: false,
      ...descriptor,
      ...readScenarioPackageDescriptor(descriptor.data),
    }));
}

function createInitialWorkspaceSettings(
  plugins: readonly E2EInstalledPluginRecord[],
): E2EWorkspaceSettings {
  return {
    version: 1,
    maxFiles: DEFAULT_MAX_FILES,
    include: DEFAULT_INCLUDE,
    respectGitignore: true,
    filterPatterns: [],
    disabledCustomFilterPatterns: [],
    plugins: [
      { id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, activation: 'enabled' },
      ...plugins.map(createWorkspacePluginSettings),
    ],
  };
}

function writeInstalledPluginCache(
  homeDir: string,
  plugins: E2EInstalledPluginRecord[],
): void {
  const userDirectoryPath = path.join(homeDir, '.codegraphy');
  fs.mkdirSync(userDirectoryPath, { recursive: true });
  fs.writeFileSync(
    path.join(userDirectoryPath, 'plugins.json'),
    `${JSON.stringify({ version: 3, plugins }, null, 2)}\n`,
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
          activation: plugin.activation ?? 'enabled',
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
  plugin: E2EInstalledPluginRecord,
): CodeGraphyWorkspacePluginSettings {
  const settings: CodeGraphyWorkspacePluginSettings = {
    id: plugin.id,
    activation: 'enabled',
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
    .flatMap(relativePath => readScenarioPackageRecords(path.resolve(repoRoot, relativePath)));

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
        .filter(plugin => !enabledPluginIds.has(plugin.id))
        .map(createWorkspacePluginSettings),
    ],
  });
}
