import type { IGraphNodeTypeDefinition } from '../../contracts';
import {
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_NODE_COLOR,
  DEFAULT_PACKAGE_NODE_COLOR,
} from '../../../fileColors';

export function createStructuralGraphNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
    {
      id: 'file',
      label: 'File',
      defaultColor: DEFAULT_NODE_COLOR,
      defaultVisible: true,
      description: {
        description: 'Source, config, docs, and other concrete files in the workspace.',
        examples: [{ code: 'src/components/Button.tsx' }],
      },
    },
    {
      id: 'folder',
      label: 'Folder',
      defaultColor: DEFAULT_FOLDER_NODE_COLOR,
      defaultVisible: false,
      description: {
        description: 'Directories that group files and other folders.',
        examples: [{ code: 'src/components/' }],
      },
    },
    {
      id: 'package',
      label: 'Package',
      defaultColor: DEFAULT_PACKAGE_NODE_COLOR,
      defaultVisible: false,
      description: {
        description: 'Workspace or external packages represented as graph nodes.',
        examples: [{ code: '@codegraphy-dev/extension' }],
      },
    },
  ];
}
