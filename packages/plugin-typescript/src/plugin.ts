import type { IPlugin } from '@codegraphy-dev/plugin-api';
import manifest from '../codegraphy.json';
import { TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE } from './aliasImport/contribution';
import { collectTypeScriptFilePaths, isTypeScriptConfigFile } from './aliasImport/files';

type AliasImportRuntime = typeof import('./aliasImport/model.js');

let aliasImportRuntimePromise: Promise<AliasImportRuntime> | undefined;

function loadAliasImportRuntime(): Promise<AliasImportRuntime> {
  aliasImportRuntimePromise ??= import('./aliasImport/model.js');
  return aliasImportRuntimePromise;
}

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
    fileColors: manifest.fileColors,
    contributeEdgeTypes: () => [TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE],
    contributeGraphScopeCapabilities: () => ({
      edgeTypes: [TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE.id],
    }),
    async analyzeFile(filePath, content, workspaceRoot) {
      const runtime = await loadAliasImportRuntime();
      return runtime.analyzeTypeScriptAliasImports(filePath, content, workspaceRoot);
    },
    async onPreAnalyze(files) {
      typeScriptFiles = collectTypeScriptFilePaths(files);
    },
    async onFilesChanged(files) {
      if (!files.some(file => isTypeScriptConfigFile(file.relativePath))) {
        return undefined;
      }

      const runtime = await loadAliasImportRuntime();
      runtime.clearTypeScriptAliasConfigCache();
      return typeScriptFiles;
    },
  };
}

export default createTypeScriptPlugin;
