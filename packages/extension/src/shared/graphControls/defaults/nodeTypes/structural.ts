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
    },
    {
      id: 'folder',
      label: 'Folder',
      defaultColor: DEFAULT_FOLDER_NODE_COLOR,
      defaultVisible: false,
    },
    {
      id: 'package',
      label: 'Package',
      defaultColor: DEFAULT_PACKAGE_NODE_COLOR,
      defaultVisible: false,
    },
  ];
}
