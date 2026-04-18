import type { IPlugin } from '@codegraphy-vscode/plugin-api';
import manifest from '../codegraphy.json';

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
  };
}

export default createTypeScriptPlugin;
