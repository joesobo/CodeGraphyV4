import * as path from 'node:path';
import type { PackageJsonWithEntrypoint } from './packageRuntimeContracts';
import { getEntrypointFromExports } from './packageExportEntrypoint';

export function resolvePackageEntrypoint(
  packageRoot: string,
  packageJson: PackageJsonWithEntrypoint,
): string {
  const entrypoint = getEntrypointFromExports(packageJson.exports)
    ?? (typeof packageJson.main === 'string' ? packageJson.main : undefined);

  if (!entrypoint) {
    throw new Error('CodeGraphy plugin package must define package.json exports or main.');
  }

  return path.resolve(packageRoot, entrypoint);
}
