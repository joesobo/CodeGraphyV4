import type { IPlugin } from '@codegraphy-vscode/plugin-api';
import manifest from '../codegraphy.json';

/**
 * Python metadata plugin.
 *
 * Base Python parsing now lives in the built-in Tree-sitter plugin. This plugin
 * only contributes Python-focused file colors and default ignore filters.
 */
export function createPythonPlugin(): IPlugin {
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

export default createPythonPlugin;
