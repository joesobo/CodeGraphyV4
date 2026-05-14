import { isIgnoredGodotLine, trimGodotTextLine } from './lines';
import { parseGodotProjectSection, parseGodotProjectSetting } from './projectSettingsLine';
import type { GodotProjectSetting, GodotProjectSettingsDocument } from './types';

export function parseGodotProjectSettingsDocument(content: string): GodotProjectSettingsDocument {
  const settings: GodotProjectSetting[] = [];
  const lines = content.split('\n');
  let section: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = trimGodotTextLine(lines[index]);
    if (isIgnoredGodotLine(line)) {
      continue;
    }

    const nextSection = parseGodotProjectSection(line);
    if (nextSection !== null) {
      section = nextSection;
      continue;
    }

    const setting = parseGodotProjectSetting(line, index + 1, section);
    if (setting) {
      settings.push(setting);
    }
  }

  return { settings };
}
