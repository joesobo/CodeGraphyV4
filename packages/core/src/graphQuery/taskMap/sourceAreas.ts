export interface TaskMapSourceAreaItem {
  file: { path: string };
  lexicalScore: number;
  score: number;
}

function rankingGroup(filePath: string): string {
  const segments = filePath.split('/');
  const sourceIndex = segments.findIndex(segment => segment === 'src' || segment === 'tests');
  if (sourceIndex < 0) return segments.slice(0, Math.min(segments.length, 4)).join('/');
  if (sourceIndex + 1 >= segments.length - 1) {
    return segments.slice(0, sourceIndex + 1).join('/');
  }
  const sourceArea = segments[sourceIndex + 1];
  const areaDepth = sourceArea === 'extension' || sourceArea === 'webview' ? 2 : 1;
  return segments.slice(0, sourceIndex + 1 + areaDepth).join('/');
}

function groupBySourceArea<T extends TaskMapSourceAreaItem>(ranked: readonly T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of ranked) {
    const group = rankingGroup(item.file.path);
    const items = groups.get(group) ?? [];
    items.push(item);
    groups.set(group, items);
  }
  return groups;
}

function compareSourceAreas<T extends TaskMapSourceAreaItem>(
  left: [string, T[]],
  right: [string, T[]],
): number {
  const leftRank = left[1][0];
  const rightRank = right[1][0];
  if (!leftRank || !rightRank) return left[0].localeCompare(right[0]);
  return Number(rightRank.lexicalScore > 0) - Number(leftRank.lexicalScore > 0)
    || rightRank.score - leftRank.score
    || rightRank.lexicalScore - leftRank.lexicalScore
    || left[0].localeCompare(right[0]);
}

function interleaveSourceAreas<T>(groups: readonly [string, T[]][], totalItems: number): T[] {
  const balanced: T[] = [];
  for (let index = 0; balanced.length < totalItems; index += 1) {
    for (const [, items] of groups) {
      const item = items[index];
      if (item) balanced.push(item);
    }
  }
  return balanced;
}

export function balanceTaskMapSourceAreas<T extends TaskMapSourceAreaItem>(ranked: readonly T[]): T[] {
  const groups = [...groupBySourceArea(ranked)].sort(compareSourceAreas);
  return interleaveSourceAreas(groups, ranked.length);
}
