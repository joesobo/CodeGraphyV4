import * as path from 'node:path';
import ts from 'typescript';

export function normalizeConfigFilePath(filePath: string): string {
  return path.resolve(filePath);
}

export function createCompilerOptionsParseHost(configFilePaths: Set<string>): ts.ParseConfigHost {
  return {
    directoryExists: directoryName => ts.sys.directoryExists?.(directoryName) ?? false,
    fileExists: fileName => ts.sys.fileExists(fileName),
    getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
    readDirectory: () => [],
    readFile: fileName => {
      configFilePaths.add(normalizeConfigFilePath(fileName));
      return ts.sys.readFile(fileName);
    },
    realpath: pathName => ts.sys.realpath?.(pathName) ?? pathName,
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
  };
}
