import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_INCLUDE, DEFAULT_MAX_FILES } from '../discovery/file/defaults';
import { getWorkspaceSettingsPath } from './paths';

export const CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME = '@codegraphy/plugin-markdown';

export interface CodeGraphyWorkspacePluginSettings {
  package: string;
  disabledFilterPatterns?: string[];
  options?: Record<string, unknown>;
}

export interface CodeGraphyWorkspaceSettings {
  version: 1;
  maxFiles: number;
  include: string[];
  respectGitignore: boolean;
  showOrphans: boolean;
  filterPatterns: string[];
  disabledCustomFilterPatterns: string[];
  plugins: CodeGraphyWorkspacePluginSettings[];
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOptions(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? { ...value } : undefined;
}

function normalizePluginSettings(value: unknown): CodeGraphyWorkspacePluginSettings[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((entry): CodeGraphyWorkspacePluginSettings | null => {
      const packageName = typeof entry.package === 'string' ? entry.package.trim() : '';
      if (packageName.length === 0) {
        return null;
      }

      const plugin: CodeGraphyWorkspacePluginSettings = {
        package: packageName,
      };
      const disabledFilterPatterns = readStringArray(entry.disabledFilterPatterns);
      if (disabledFilterPatterns.length > 0) {
        plugin.disabledFilterPatterns = [...new Set(disabledFilterPatterns)];
      }

      const options = readOptions(entry.options);
      if (options) {
        plugin.options = options;
      }

      return plugin;
    })
    .filter((entry): entry is CodeGraphyWorkspacePluginSettings => entry !== null);
}

export function createDefaultCodeGraphyWorkspaceSettings(): CodeGraphyWorkspaceSettings {
  return {
    version: 1,
    maxFiles: DEFAULT_MAX_FILES,
    include: DEFAULT_INCLUDE,
    respectGitignore: true,
    showOrphans: true,
    filterPatterns: [],
    disabledCustomFilterPatterns: [],
    plugins: [],
  };
}

export function createInitialCodeGraphyWorkspaceSettings(): CodeGraphyWorkspaceSettings {
  return {
    ...createDefaultCodeGraphyWorkspaceSettings(),
    plugins: [{
      package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
    }],
  };
}

export function normalizeCodeGraphyWorkspaceSettings(
  value: unknown,
): CodeGraphyWorkspaceSettings {
  const defaults = createDefaultCodeGraphyWorkspaceSettings();
  if (!isRecord(value)) {
    return defaults;
  }

  return {
    version: 1,
    maxFiles: typeof value.maxFiles === 'number' && Number.isFinite(value.maxFiles)
      ? value.maxFiles
      : defaults.maxFiles,
    include: readStringArray(value.include).length > 0
      ? readStringArray(value.include)
      : defaults.include,
    respectGitignore: typeof value.respectGitignore === 'boolean'
      ? value.respectGitignore
      : defaults.respectGitignore,
    showOrphans: typeof value.showOrphans === 'boolean'
      ? value.showOrphans
      : defaults.showOrphans,
    filterPatterns: [...new Set(readStringArray(value.filterPatterns))],
    disabledCustomFilterPatterns: [...new Set(readStringArray(value.disabledCustomFilterPatterns))],
    plugins: normalizePluginSettings(value.plugins),
  };
}

export function readCodeGraphyWorkspaceSettings(
  workspaceRoot: string,
): CodeGraphyWorkspaceSettings {
  try {
    return normalizeCodeGraphyWorkspaceSettings(
      JSON.parse(fs.readFileSync(getWorkspaceSettingsPath(workspaceRoot), 'utf-8')),
    );
  } catch {
    return createDefaultCodeGraphyWorkspaceSettings();
  }
}

export function readCodeGraphyWorkspaceSettingsOrInitial(
  workspaceRoot: string,
): CodeGraphyWorkspaceSettings {
  if (!fs.existsSync(getWorkspaceSettingsPath(workspaceRoot))) {
    return createInitialCodeGraphyWorkspaceSettings();
  }

  return readCodeGraphyWorkspaceSettings(workspaceRoot);
}

export function writeCodeGraphyWorkspaceSettings(
  workspaceRoot: string,
  settings: CodeGraphyWorkspaceSettings,
): void {
  const settingsPath = getWorkspaceSettingsPath(workspaceRoot);
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(
    settingsPath,
    `${JSON.stringify(normalizeCodeGraphyWorkspaceSettings(settings), null, 2)}\n`,
  );
}

export function ensureCodeGraphyWorkspaceSettings(
  workspaceRoot: string,
): CodeGraphyWorkspaceSettings {
  if (!fs.existsSync(getWorkspaceSettingsPath(workspaceRoot))) {
    const settings = createInitialCodeGraphyWorkspaceSettings();
    writeCodeGraphyWorkspaceSettings(workspaceRoot, settings);
    return settings;
  }
  return readCodeGraphyWorkspaceSettings(workspaceRoot);
}
