import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function moduleDirectory(moduleUrl?: string): string | undefined {
  if (!moduleUrl) {
    return undefined;
  }

  if (moduleUrl.startsWith('file:')) {
    return dirname(fileURLToPath(moduleUrl));
  }

  if (moduleUrl.startsWith('/')) {
    return dirname(moduleUrl);
  }

  return undefined;
}
