/**
 * @fileoverview Godot project settings dependency detection.
 * Finds resource-bearing settings such as `run/main_scene` and `[autoload]`
 * entries in `project.godot`.
 * @module plugins/godot/sources/project-settings
 */

import type { IAnalysisRelation } from '@codegraphy/plugin-api';
import type { GDScriptRuleContext } from '../parser';
import { materializeResolvedPath } from '../resolved-path';
import {
  parseGodotProjectSettingsDocument,
  unquoteGodotValue,
} from '../textResource/parser';

interface IProjectSettingReference {
  specifier: string;
}

function normalizeAutoloadValue(value: string): string {
  return value.startsWith('*') ? value.slice(1) : value;
}

function parseProjectSettingReference(
  section: string | null,
  key: string,
  rawValue: string,
): IProjectSettingReference | null {
  if (section === 'application' && key === 'run/main_scene') {
    const specifier = unquoteGodotValue(rawValue);
    return specifier ? { specifier } : null;
  }

  if (section === 'autoload') {
    const specifier = normalizeAutoloadValue(unquoteGodotValue(rawValue));
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

  for (const setting of parseGodotProjectSettingsDocument(content).settings) {
    const reference = parseProjectSettingReference(setting.section, setting.key, setting.value);
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
