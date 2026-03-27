import { type ScrapExampleMetric } from './scrapTypes';

const BLOCK_SEPARATOR = '\u001f';

export function blockPathKey(path: string[]): string {
  return path.join(BLOCK_SEPARATOR);
}

export function blockPathFromKey(key: string): string[] {
  return key.split(BLOCK_SEPARATOR);
}

export function prefixBlockGroups(examples: ScrapExampleMetric[]): Map<string, ScrapExampleMetric[]> {
  const groups = new Map<string, ScrapExampleMetric[]>();

  for (const example of examples) {
    for (let depth = 1; depth <= example.blockPath.length; depth += 1) {
      const key = blockPathKey(example.blockPath.slice(0, depth));
      const group = groups.get(key) ?? [];
      group.push(example);
      groups.set(key, group);
    }
  }

  return groups;
}
