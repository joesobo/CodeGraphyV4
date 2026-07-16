import * as path from 'node:path';
import type { IAnalysisFile } from '@codegraphy-dev/plugin-api';

const TYPESCRIPT_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);

export function isTypeScriptSourceFile(filePath: string): boolean {
  return TYPESCRIPT_SOURCE_EXTENSIONS.has(path.extname(filePath));
}

export function isTypeScriptConfigFile(filePath: string): boolean {
  return /^tsconfig(?:\..*)?\.json$/.test(path.basename(filePath));
}

export function collectTypeScriptFilePaths(
  files: ReadonlyArray<Pick<IAnalysisFile, 'relativePath'>>,
): string[] {
  return files
    .filter(file => isTypeScriptSourceFile(file.relativePath))
    .map(file => file.relativePath);
}
