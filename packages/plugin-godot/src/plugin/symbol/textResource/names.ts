import * as path from 'path';

export function toPascalName(relativeFilePath: string): string {
  return path.parse(relativeFilePath).name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
