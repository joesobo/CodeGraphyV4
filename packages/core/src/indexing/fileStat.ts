import * as fs from 'node:fs/promises';

export async function getFileStat(filePath: string): Promise<{ mtime: number; size: number } | null> {
  try {
    const stat = await fs.stat(filePath);
    return {
      mtime: stat.mtimeMs,
      size: stat.size,
    };
  } catch {
    return null;
  }
}
