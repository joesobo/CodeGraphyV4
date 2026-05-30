import type { IPlugin } from '@codegraphy-dev/plugin-api';
import manifest from '../codegraphy.json';
import {
  analyzeTypeScriptAliasImports,
  collectTypeScriptFilePaths,
  isTypeScriptConfigFile,
  TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE,
} from './aliasImport/model';

/**
 * TypeScript/JavaScript metadata plugin.
 *
 * Base JS/TS parsing lives in the built-in Tree-sitter plugin. This plugin adds
 * TypeScript project-aware relationships and ecosystem defaults on top.
 */
export function createTypeScriptPlugin(): IPlugin {
  let typeScriptFiles: string[] = [];

  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    fileColors: manifest.fileColors,
    contributeEdgeTypes: () => [TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE],
    analyzeFile: analyzeTypeScriptAliasImports,
    async onPreAnalyze(files) {
      typeScriptFiles = collectTypeScriptFilePaths(files);
    },
    async onFilesChanged(files) {
      return files.some(file => isTypeScriptConfigFile(file.relativePath))
        ? typeScriptFiles
        : undefined;
    },
  };
}

export default createTypeScriptPlugin;
