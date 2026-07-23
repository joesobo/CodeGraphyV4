import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { manifest } from './metadata';
import {
  analyzeTypeScriptAliasImports,
  clearTypeScriptAliasConfigCache,
  collectTypeScriptFilePaths,
  isTypeScriptConfigFile,
  TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE,
} from './aliasImport/model';

/**
 * TypeScript/JavaScript metadata plugin.
 *
 * Base JS/TS parsing lives in Core Tree-sitter Analysis. This plugin adds
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
    updateImpact: manifest.updateImpact as IPlugin['updateImpact'],
    contributeEdgeTypes: () => [TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE],
    contributeGraphScopeCapabilities: () => ({
      edgeTypes: [TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE.id],
    }),
    analyzeFile: analyzeTypeScriptAliasImports,
    async onPreAnalyze(files) {
      typeScriptFiles = collectTypeScriptFilePaths(files);
    },
    async onFilesChanged(files, _workspaceRoot, context) {
      if (!files.some(file => isTypeScriptConfigFile(file.relativePath))) {
        return undefined;
      }

      clearTypeScriptAliasConfigCache();
      return context?.workspaceFiles
        ? collectTypeScriptFilePaths(context.workspaceFiles)
        : typeScriptFiles;
    },
  };
}

export default createTypeScriptPlugin;
