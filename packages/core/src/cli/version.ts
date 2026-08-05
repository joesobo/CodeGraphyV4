import packageMetadata from '../../package.json' with { type: 'json' };

export function readCliVersion(): string {
  return `codegraphy ${packageMetadata.version}`;
}
