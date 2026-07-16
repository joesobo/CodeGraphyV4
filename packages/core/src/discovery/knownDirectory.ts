import { normalizeDiscoveryPath } from './pathNormalization';

export function shouldSkipKnownDirectory(relativePath: string): boolean {
  const normalizedRelative = normalizeDiscoveryPath(relativePath);

  return normalizedRelative === 'node_modules'
    || normalizedRelative === '.git'
    || normalizedRelative === '.codegraphy'
    || normalizedRelative.startsWith('node_modules/')
    || normalizedRelative.startsWith('.git/')
    || normalizedRelative.startsWith('.codegraphy/');
}
