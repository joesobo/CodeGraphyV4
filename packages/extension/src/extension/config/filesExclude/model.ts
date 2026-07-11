import type { IFilesExcludeRule } from '@codegraphy-dev/core';

type FilesExcludeConfiguration = Record<string, unknown>;

interface FilesExcludeWorkspaceConfiguration {
  get<T>(key: string, defaultValue: T): T;
}

interface FilesExcludeWorkspace<TResource> {
  getConfiguration(
    section: string,
    resource: TResource,
  ): FilesExcludeWorkspaceConfiguration;
}

function normalizeFilesExcludeRule(
  pattern: string,
  value: unknown,
): IFilesExcludeRule | undefined {
  const normalizedPattern = pattern.trim();
  if (!normalizedPattern) return undefined;
  if (value === true) return { pattern: normalizedPattern };
  if (!value || typeof value !== 'object' || !('when' in value)) return undefined;
  const when = (value as { when?: unknown }).when;
  if (typeof when !== 'string' || !when.trim()) return undefined;
  return { pattern: normalizedPattern, when: when.trim() };
}

export function normalizeFilesExcludeRules(
  configuration: FilesExcludeConfiguration | undefined,
): IFilesExcludeRule[] {
  return Object.entries(configuration ?? {})
    .map(([pattern, value]) => normalizeFilesExcludeRule(pattern, value))
    .filter((rule): rule is IFilesExcludeRule => rule !== undefined)
    .sort((left, right) => left.pattern.localeCompare(right.pattern));
}

export function readFilesExcludeRules<TResource>(
  workspace: FilesExcludeWorkspace<TResource>,
  workspaceResource: TResource,
): IFilesExcludeRule[] {
  const configuration = workspace
    .getConfiguration('files', workspaceResource)
    .get<FilesExcludeConfiguration>('exclude', {});
  return normalizeFilesExcludeRules(configuration);
}
