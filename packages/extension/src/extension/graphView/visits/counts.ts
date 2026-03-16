export function getGraphViewVisitCount(
  visits: Record<string, number>,
  filePath: string
): number {
  return visits[filePath] ?? 0;
}

export function incrementGraphViewVisitCount(
  visits: Record<string, number>,
  filePath: string
): { visits: Record<string, number>; accessCount: number } {
  const nextVisits = {
    ...visits,
    [filePath]: (visits[filePath] ?? 0) + 1,
  };

  return {
    visits: nextVisits,
    accessCount: nextVisits[filePath],
  };
}
