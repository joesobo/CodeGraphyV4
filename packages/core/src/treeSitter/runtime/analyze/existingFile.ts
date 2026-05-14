import { treeSitterPathIsFile } from '../pathHost';

export function findExistingFile(candidates: readonly string[]): string | null {
  for (const candidatePath of candidates) {
    if (treeSitterPathIsFile(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
}
