import type { IPlugin } from '@codegraphy-dev/plugin-api';
import manifest from '../codegraphy.json';

export const TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE = {
  id: 'codegraphy.typescript:alias-import',
  label: 'TypeScript Alias Import',
  defaultColor: '#38BDF8',
  defaultVisible: true,
} as const;

/**
 * TypeScript/JavaScript metadata plugin.
 *
 * Base JS/TS parsing now lives in the built-in Tree-sitter plugin. This plugin
 * only contributes ecosystem metadata such as file colors and default filters.
 */
export function createTypeScriptPlugin(): IPlugin {
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    fileColors: manifest.fileColors,
    contributeEdgeTypes: () => [TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE],
  };
}

export default createTypeScriptPlugin;
