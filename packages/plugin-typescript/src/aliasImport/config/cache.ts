import * as path from 'node:path';
import ts from 'typescript';
import { createCompilerOptionsParseHost, normalizeConfigFilePath } from './parseHost';
import { areConfigFileStampsFresh, createConfigFileStamps } from './stamps';
import type { FileStamp } from './stamps';

type CompilerOptionsCacheEntry = {
  configFileStamps: Map<string, FileStamp>;
  parsed: ts.ParsedCommandLine | null;
};

const compilerOptionsCache = new Map<string, CompilerOptionsCacheEntry>();

export function clearCompilerOptionsCache(): void {
  compilerOptionsCache.clear();
}

export function readCompilerOptions(tsconfigPath: string): ts.ParsedCommandLine | null {
  const cached = compilerOptionsCache.get(tsconfigPath);
  if (cached && areConfigFileStampsFresh(cached.configFileStamps)) {
    return cached.parsed;
  }

  const configFilePaths = new Set<string>([normalizeConfigFilePath(tsconfigPath)]);
  const readResult = ts.readConfigFile(tsconfigPath, fileName => {
    configFilePaths.add(normalizeConfigFilePath(fileName));
    return ts.sys.readFile(fileName);
  });
  const parsed = readResult.error
    ? null
    : ts.parseJsonConfigFileContent(
        readResult.config,
        createCompilerOptionsParseHost(configFilePaths),
        path.dirname(tsconfigPath),
        undefined,
        tsconfigPath,
      );

  compilerOptionsCache.set(tsconfigPath, {
    configFileStamps: createConfigFileStamps(configFilePaths),
    parsed,
  });

  return parsed ?? null;
}
