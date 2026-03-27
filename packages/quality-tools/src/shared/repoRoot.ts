import { resolve } from 'path';
import { fileURLToPath } from 'url';

export const PACKAGE_ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
