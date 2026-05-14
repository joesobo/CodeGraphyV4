import { parseGodotTagFields } from './tagFields';
import type { GodotTextResourceTag } from './types';

const TAG_REGEX = /^\[\s*([A-Za-z_][A-Za-z0-9_]*)\b(.*)\]$/;

export function parseGodotTextResourceTag(line: string, lineNumber: number): GodotTextResourceTag | null {
  const tagMatch = line.match(TAG_REGEX);
  if (!tagMatch) {
    return null;
  }

  return {
    line: lineNumber,
    name: tagMatch[1],
    fields: parseGodotTagFields(tagMatch[2]),
  };
}
