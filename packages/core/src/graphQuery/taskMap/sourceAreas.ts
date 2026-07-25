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

export function balanceTaskMapSourceAreas<T extends TaskMapSourceAreaItem>(ranked: readonly T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const item of ranked) {
    const group = rankingGroup(item.file.path);
    const items = groups.get(group) ?? [];
    items.push(item);
    groups.set(group, items);
  }
  const ordered = [...groups.entries()].sort((left, right) => {
    const leftRank = left[1][0];
    const rightRank = right[1][0];
    if (!leftRank || !rightRank) return left[0].localeCompare(right[0]);
    return Number(rightRank.lexicalScore > 0) - Number(leftRank.lexicalScore > 0)
      || rightRank.score - leftRank.score
      || rightRank.lexicalScore - leftRank.lexicalScore
      || left[0].localeCompare(right[0]);
  });
  const balanced: T[] = [];
  for (let index = 0; balanced.length < ranked.length; index += 1) {
    for (const [, items] of ordered) {
      const item = items[index];
      if (item) balanced.push(item);
    }
  }
  return balanced;
}
