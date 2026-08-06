import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

export function findNativeRuntimeCode(root) {
  const codePaths = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) codePaths.push(...findNativeRuntimeCode(entryPath));
    else if (entry.isFile() && (entry.name.endsWith('.node') || entry.name.endsWith('.dylib'))) {
      codePaths.push(entryPath);
    }
  }
  return codePaths.sort();
}

export function signNativeRuntimeCode(root, identity) {
  const codePaths = findNativeRuntimeCode(root);
  for (const codePath of codePaths) {
    const timestamp = identity === '-' ? '--timestamp=none' : '--timestamp';
    execFileSync('codesign', ['--force', '--sign', identity, timestamp, codePath], { stdio: 'inherit' });
    execFileSync('codesign', ['--verify', '--strict', codePath], { stdio: 'inherit' });
  }
  return codePaths;
}
