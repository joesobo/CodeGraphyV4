import type { IFileAnalysisResult, IPlugin } from '@codegraphy-dev/plugin-api';
import manifest from '../codegraphy.json';

type VueAnalysisRuntime = typeof import('./analysis.js');

let vueAnalysisRuntimePromise: Promise<VueAnalysisRuntime> | undefined;

function loadVueAnalysisRuntime(): Promise<VueAnalysisRuntime> {
  vueAnalysisRuntimePromise ??= import('./analysis.js');
  return vueAnalysisRuntimePromise;
}

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
    async analyzeFile(filePath: string, content: string): Promise<IFileAnalysisResult> {
      const runtime = await loadVueAnalysisRuntime();
      return runtime.analyzeVueSfc(filePath, content);
    },
  };
}

export default createVuePlugin;
