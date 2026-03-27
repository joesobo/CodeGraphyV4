import { relative, sep } from 'path';

export function toPosix(value: string): string {
  return value.replace(/\\/g, '/').split(sep).join('/');
}

export function relativeTo(root: string, value: string): string {
  return toPosix(relative(root, value));
}

export function packagePathParts(relativePath: string): {
  packageName?: string;
  packageRelativePath?: string;
} {
  const segments = toPosix(relativePath).split('/');
  const packageRoot = segments[0];
  const packageName = segments[1];
  const packageRelativeSegments = segments.slice(2);

  if (packageRoot !== 'packages' || !packageName || packageRelativeSegments.length === 0) {
    return {};
  }

  return {
    packageName,
    packageRelativePath: packageRelativeSegments.join('/')
  };
}
