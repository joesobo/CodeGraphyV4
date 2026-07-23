import type { IFileAnalysisResult, IPlugin } from '@codegraphy-dev/plugin-api';
import { manifest } from './metadata';
import { analyzeSvelteComponent } from './analysis';

export function createSveltePlugin(): IPlugin {
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    updateImpact: manifest.updateImpact,
    contributeGraphScopeCapabilities: () => ({
      edgeTypes: ['import', 'type-import', 'call'],
    }),
    analyzeFile(filePath: string, content: string): Promise<IFileAnalysisResult> {
      return Promise.resolve(analyzeSvelteComponent(filePath, content));
    },
  };
}

export default createSveltePlugin;
