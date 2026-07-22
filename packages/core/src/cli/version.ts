import { readFileSync } from 'node:fs';

interface PackageMetadata {
  version: string;
}

export function readCliVersion(): string {
  const packagePath = new URL('../../package.json', import.meta.url);
  const metadata = JSON.parse(readFileSync(packagePath, 'utf8')) as PackageMetadata;
  return `codegraphy ${metadata.version}`;
}
