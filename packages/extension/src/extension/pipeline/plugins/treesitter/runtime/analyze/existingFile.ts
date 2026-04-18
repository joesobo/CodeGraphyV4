import * as fs from 'node:fs';

export function findExistingFile(candidates: readonly string[]): string | null {
  for (const candidatePath of candidates) {
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath;
    }
  }

  return null;
}
