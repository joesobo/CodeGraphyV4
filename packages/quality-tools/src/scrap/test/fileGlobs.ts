import { globSync } from 'glob';
import { resolvePackageToolGlobs } from '../../config/quality';

export function discoverPackageTestFiles(packageName: string, repoRoot: string): string[] {
  const patterns = resolvePackageToolGlobs(repoRoot, packageName, 'scrap');
  return [...new Set(patterns.include.flatMap((pattern) => globSync(pattern, {
    absolute: true,
    cwd: repoRoot,
    ignore: patterns.exclude
  })))].sort();
}
