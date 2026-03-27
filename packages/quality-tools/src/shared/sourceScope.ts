import { type QualityTarget } from './resolveTarget';

function isInsideSourceTree(target: QualityTarget): boolean {
  return target.packageRelativePath === 'src' || target.packageRelativePath?.startsWith('src/') === true;
}

export function resolveSourceScope(target: QualityTarget): string | undefined {
  if (target.kind === 'repo') {
    return 'packages';
  }

  if (!target.packageName) {
    return undefined;
  }

  if (target.kind === 'package') {
    return `packages/${target.packageName}/src`;
  }

  if (!isInsideSourceTree(target)) {
    return undefined;
  }

  return target.relativePath;
}

export function assertSourceScope(target: QualityTarget): string {
  const scope = resolveSourceScope(target);
  if (!scope) {
    throw new Error(
      'This command expects a package root or a path inside a package src/ tree.'
    );
  }
  return scope;
}
