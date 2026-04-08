import { posix } from 'path';
import { type QualityTarget } from '../../shared/resolve/target';
import { fileIncludes } from './fileIncludes';
import { directoryIncludes, packageIncludes } from './includeRoots';

function relativeSourcePath(target: QualityTarget): string | undefined {
  if (!target.packageRelativePath?.startsWith('src/')) {
    return undefined;
  }

  return target.packageRelativePath.slice('src/'.length);
}

export function resolveScopedVitestIncludes(target: QualityTarget): string[] | undefined {
  if (!target.packageName) {
    return undefined;
  }

  if (target.kind === 'package') {
    return packageIncludes(target.packageName);
  }

  const relativeSource = relativeSourcePath(target);
  if (!relativeSource) {
    return undefined;
  }

  const normalizedSource = posix.normalize(relativeSource);
  if (target.kind === 'file') {
    return fileIncludes(target.packageName, normalizedSource);
  }

  return directoryIncludes(target.packageName, normalizedSource);
}
