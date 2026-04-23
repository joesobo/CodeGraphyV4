/**
 * @fileoverview Godot project settings dependency detection.
 * Finds resource-bearing settings such as `run/main_scene` and `[autoload]`
 * entries in `project.godot`.
 * @module plugins/godot/sources/project-settings
 */

import type { IAnalysisRelation } from '@codegraphy-vscode/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { materializeResolvedPath } from '../resolved-path';

interface IProjectSettingReference {
  specifier: string;
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"'))
    || (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function normalizeAutoloadValue(value: string): string {
  return value.startsWith('*') ? value.slice(1) : value;
}

function parseProjectSettingLine(section: string | null, line: string): IProjectSettingReference | null {
  const separatorIndex = line.indexOf('=');
  if (separatorIndex < 0) {
    return null;
  }

  const key = line.slice(0, separatorIndex).trim();
  const rawValue = line.slice(separatorIndex + 1).trim();
  if (!key || !rawValue) {
    return null;
  }

  if (section === 'application' && key === 'run/main_scene') {
    const specifier = unquote(rawValue);
    return specifier ? { specifier } : null;
  }

  if (section === 'autoload') {
    const specifier = normalizeAutoloadValue(unquote(rawValue));
    return specifier ? { specifier } : null;
  }

  return null;
}

export function detect(
  content: string,
  filePath: string,
  ctx: GDScriptRuleContext,
): IAnalysisRelation[] {
  const relations: IAnalysisRelation[] = [];
  const projectRoot = ctx.projectRoot ?? ctx.workspaceRoot;
  let section: string | null = null;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith(';')) {
      continue;
    }

    const sectionMatch = line.match(/^\[\s*([^\]]+)\s*\]$/);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      continue;
    }

    const reference = parseProjectSettingLine(section, line);
    if (!reference) {
      continue;
    }

    const resolved = ctx.resolver.resolveTextResourcePath(reference.specifier, ctx.relativeFilePath);
    const resolvedPath = resolved
      ? materializeResolvedPath({
          projectRoot,
          resolvedPath: resolved,
          workspaceRoot: ctx.workspaceRoot,
        })
      : null;

    relations.push({
      kind: 'load',
      specifier: reference.specifier,
      resolvedPath,
      type: 'static',
      sourceId: 'project-settings',
      fromFilePath: filePath,
      toFilePath: resolvedPath,
    });
  }

  return relations;
}

class ProjectSettingsRule {
  readonly id = 'project-settings';
  readonly detect = detect;
}

const rule = new ProjectSettingsRule();
export default rule;
