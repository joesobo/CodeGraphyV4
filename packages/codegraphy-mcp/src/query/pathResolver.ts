import { toRepoRelativeFilePath } from '../database/paths';
import type { QueryContext } from './model';

export interface ResolvedQueryFilePath {
  filePath: string;
  limitations: string[];
}

export class AmbiguousQueryFilePathError extends Error {
  constructor(
    readonly input: string,
    readonly candidates: string[],
  ) {
    super(`File path "${input}" matched multiple indexed files. Pass a more specific repo-relative path.`);
  }
}

function normalizeInput(filePath: string, repo: string): string {
  return toRepoRelativeFilePath(filePath, repo)
    .replaceAll('\\', '/')
    .replace(/^\.\//, '');
}

function matchesPath(filePath: string, input: string): boolean {
  return filePath === input
    || filePath.endsWith(`/${input}`)
    || input.endsWith(`/${filePath}`);
}

export function resolveQueryFilePath(
  filePath: string,
  repo: string,
  context: QueryContext,
): ResolvedQueryFilePath {
  const normalized = normalizeInput(filePath, repo);
  if (context.files.has(normalized)) {
    return {
      filePath: normalized,
      limitations: [],
    };
  }

  const candidates = [...context.files]
    .filter((candidate) => matchesPath(candidate, normalized))
    .sort((left, right) => left.localeCompare(right));

  if (candidates.length === 1) {
    const resolvedFilePath = candidates[0];
    return {
      filePath: resolvedFilePath,
      limitations: [
        `Resolved file path "${filePath}" to "${resolvedFilePath}".`,
      ],
    };
  }

  if (candidates.length > 1) {
    throw new AmbiguousQueryFilePathError(filePath, candidates);
  }

  return {
    filePath: normalized,
    limitations: [
      `File path "${filePath}" was not found in the saved CodeGraphy index. Use a full repo-relative path or reindex CodeGraphy if this file should exist.`,
    ],
  };
}
