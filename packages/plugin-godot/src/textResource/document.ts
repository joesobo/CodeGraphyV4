import { trimGodotTextLine } from './lines';
import { parseGodotTextResourceTag } from './tags';
import type { GodotTextResourceDocument, GodotTextResourceTag } from './types';

export function parseGodotTextResourceDocument(content: string): GodotTextResourceDocument {
  const tags: GodotTextResourceTag[] = [];
  const lines = content.split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    const line = trimGodotTextLine(lines[index]);
    const tag = parseGodotTextResourceTag(line, index + 1);
    if (tag) {
      tags.push(tag);
    }
  }

  return { tags };
}
