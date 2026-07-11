import type { IFileAnalysisResult, IPlugin, IPluginManifest } from '@codegraphy-dev/plugin-api';
import path from 'node:path';
import manifestJson from '../codegraphy.json';

const manifest: IPluginManifest = manifestJson;

export function createSamplePlugin(): IPlugin {
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    contributeNodeTypes: () => [{
      id: 'sample:marker',
      label: 'Sample Marker',
      defaultColor: '#F59E0B',
      defaultVisible: true,
    }],
    contributeGraphScopeCapabilities: () => ({
      nodeTypes: ['sample:marker'],
    }),
    analyzeFile(filePath, _content, workspaceRoot): Promise<IFileAnalysisResult> {
      const relativePath = path.relative(workspaceRoot, filePath).split(path.sep).join('/');
      return Promise.resolve({
        filePath,
        nodes: [{
          id: `${relativePath}:sample-marker`,
          nodeType: 'sample:marker',
          label: 'Hello from Sample Plugin',
          filePath,
          parentId: relativePath,
        }],
      });
    },
  };
}

export default createSamplePlugin;
