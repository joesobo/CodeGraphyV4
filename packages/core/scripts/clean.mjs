import { rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function cleanCoreBuildOutput(packageDir = process.cwd()) {
  rmSync(path.join(packageDir, 'dist'), { recursive: true, force: true });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cleanCoreBuildOutput();
}
