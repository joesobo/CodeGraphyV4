import type { IGraphNodeTypeDefinition } from '../contracts';
import {
  DEFAULT_FOLDER_NODE_COLOR,
  DEFAULT_NODE_COLOR,
  DEFAULT_PACKAGE_NODE_COLOR,
} from '../../fileColors';

export function createCoreGraphNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
    {
      id: 'file',
      label: 'Files',
      defaultColor: DEFAULT_NODE_COLOR,
      defaultVisible: true,
    },
    {
      id: 'folder',
      label: 'Folders',
      defaultColor: DEFAULT_FOLDER_NODE_COLOR,
      defaultVisible: false,
    },
    {
      id: 'package',
      label: 'Packages',
      defaultColor: DEFAULT_PACKAGE_NODE_COLOR,
      defaultVisible: false,
    },
    {
      id: 'symbol',
      label: 'Symbols',
      defaultColor: '#8B5CF6',
      defaultVisible: false,
    },
    {
      id: 'variable',
      label: 'Variables',
      defaultColor: '#14B8A6',
      defaultVisible: false,
    },
  ];
}

export const CORE_GRAPH_NODE_TYPES: IGraphNodeTypeDefinition[] = createCoreGraphNodeTypes();
