export type ParsedDiffLine =
  | { kind: 'add'; filePath: string }
  | { kind: 'delete'; filePath: string }
  | { kind: 'modify'; filePath: string }
  | { kind: 'rename'; oldPath: string; newPath: string }
  | { kind: 'ignore' };

export function parseDiffLine(line: string): ParsedDiffLine {
  const [status, firstPath, secondPath] = line.split('\t');

  return parseRenameDiffLine(status, firstPath, secondPath)
    ?? parseSinglePathDiffLine(status, firstPath)
    ?? { kind: 'ignore' };
}

function parseRenameDiffLine(
  status: string,
  oldPath?: string,
  newPath?: string,
): ParsedDiffLine | null {
  if (!status.startsWith('R') || !oldPath || !newPath) {
    return null;
  }

  return {
    kind: 'rename',
    oldPath,
    newPath,
  };
}

function parseSinglePathDiffLine(
  status: string,
  filePath?: string,
): ParsedDiffLine | null {
  if (!filePath) {
    return null;
  }

  return singlePathDiffFactories[status]?.(filePath) ?? null;
}

const singlePathDiffFactories: Record<
  string,
  (filePath: string) => Extract<ParsedDiffLine, { filePath: string }>
> = {
  'A': (filePath) => ({ kind: 'add', filePath }),
  'D': (filePath) => ({ kind: 'delete', filePath }),
  'M': (filePath) => ({ kind: 'modify', filePath }),
};
