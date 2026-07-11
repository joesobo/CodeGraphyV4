import manifest from '../codegraphy.json';
import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { getMaterialThemeDefaultGroups } from './view';

export function createMaterialIconsPlugin(): IPlugin {
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    updateImpact: manifest.updateImpact as IPlugin['updateImpact'],
    graphView: {
      defaultGroups: [{
        id: 'material-icons',
        label: 'Material Icon Theme',
        createGroups: (context) => getMaterialThemeDefaultGroups(
          context.visibleGraph,
          undefined,
          { includeFolderMatches: context.includeFolderMatches },
        ),
      }],
    },
  };
}

export default createMaterialIconsPlugin;
