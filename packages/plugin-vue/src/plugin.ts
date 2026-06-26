import type { IFileAnalysisResult, IPlugin } from '@codegraphy-dev/plugin-api';
import manifest from '../codegraphy.json';
import { analyzeVueSfc } from './analysis';

export function createVuePlugin(): IPlugin {
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    updateImpact: manifest.updateImpact as IPlugin['updateImpact'],
    fileColors: manifest.fileColors,
    contributeGraphScopeCapabilities: () => ({
      edgeTypes: ['import', 'type-import', 'call'],
    }),
    analyzeFile(filePath: string, content: string): Promise<IFileAnalysisResult> {
      return Promise.resolve(analyzeVueSfc(filePath, content));
    },
  };
}

export default createVuePlugin;
