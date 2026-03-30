import { type ScrapExampleMetric } from '../types';

const BLOCK_SEPARATOR = '\u001f';

export function blockPathKey(path: string[]): string {
  return path.join(BLOCK_SEPARATOR);
}

export function blockPathFromKey(key: string): string[] {
  return key.split(BLOCK_SEPARATOR);
}

export function prefixBlockGroups(examples: ScrapExampleMetric[]): Map<string, ScrapExampleMetric[]> {
  const groups = new Map<string, ScrapExampleMetric[]>();

  examples.forEach((example) => {
    example.blockPath.forEach((_, depthIndex) => {
      const key = blockPathKey(example.blockPath.slice(0, depthIndex + 1));
      const group = groups.get(key) ?? [];
      group.push(example);
      groups.set(key, group);
    });
  });

  return groups;
}
