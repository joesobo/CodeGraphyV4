import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  createRuntimePackagePlans,
  resolveRuntimePackageRootPath,
} from './runtimeStaging/model';
import {
  resolveExtensionRuntimeTarget,
  type ExtensionRuntimeTarget,
} from './runtimeStaging/types';

export {
  EXTENSION_RUNTIME_PACKAGE_NAMES,
  getExtensionRuntimePackageNames,
  resolveRuntimePackageRootPath,
} from './runtimeStaging/model';
export {
  EXTENSION_RUNTIME_TARGETS,
  resolveExtensionRuntimeTarget,
} from './runtimeStaging/types';

export function getVendoredPackageRootPath(
  outputFilePath: string,
  packageName: string,
): string {
  return path.join(path.dirname(outputFilePath), 'node_modules', ...packageName.split('/'));
}

function toPackageRelativeEntrypoint(entrypoint: string): string {
  return entrypoint.endsWith('/')
    ? `${entrypoint}index.js`
    : `${entrypoint}/index.js`;
}

function normalizeVendoredPackageEntrypoint(packageRootPath: string): void {
  const manifestPath = path.join(packageRootPath, 'package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    main?: unknown;
    [key: string]: unknown;
  };
  if (typeof manifest.main !== 'string' || path.extname(manifest.main) !== '') {
    return;
  }

  const normalizedMain = toPackageRelativeEntrypoint(manifest.main);
  if (!fs.existsSync(path.join(packageRootPath, normalizedMain))) {
    return;
  }

  fs.writeFileSync(
    manifestPath,
    `${JSON.stringify({ ...manifest, main: normalizedMain }, null, 2)}\n`,
  );
}

export function copyRuntimePackage(
  outputFilePath: string,
  packageName: string,
  relativeFilePaths: readonly string[],
  resolvePackageRootPath: (packageName: string) => string = resolveRuntimePackageRootPath,
): string {
  const sourcePath = resolvePackageRootPath(packageName);
  const targetPath = getVendoredPackageRootPath(outputFilePath, packageName);

  fs.rmSync(targetPath, { recursive: true, force: true });

  for (const relativeFilePath of [...new Set(relativeFilePaths)]) {
    const sourceFilePath = path.join(sourcePath, relativeFilePath);
    if (!fs.existsSync(sourceFilePath) || !fs.statSync(sourceFilePath).isFile()) {
      throw new Error(`Runtime package file is not a file: ${packageName}/${relativeFilePath}`);
    }

    const targetFilePath = path.join(targetPath, relativeFilePath);
    fs.mkdirSync(path.dirname(targetFilePath), { recursive: true });
    fs.cpSync(sourceFilePath, targetFilePath, { force: true });
  }

  normalizeVendoredPackageEntrypoint(targetPath);
  return targetPath;
}

export function syncExtensionRuntimePackages(
  outputFilePath: string,
  target: ExtensionRuntimeTarget = resolveExtensionRuntimeTarget(),
): string[] {
  fs.rmSync(path.join(path.dirname(outputFilePath), 'node_modules'), {
    recursive: true,
    force: true,
  });

  return createRuntimePackagePlans(target).map(plan => copyRuntimePackage(
    outputFilePath,
    plan.packageName,
    plan.relativeFilePaths,
    plan.resolvePackageRootPath,
  ));
}
