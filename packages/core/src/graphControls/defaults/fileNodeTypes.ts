import type { IGraphNodeTypeDefinition } from '../contracts';

export const CORE_FILE_NODE_TYPES: IGraphNodeTypeDefinition[] = [
  {
    id: 'file',
    label: 'File',
    defaultVisible: true,
  },
  {
    id: 'folder',
    label: 'Folder',
    defaultVisible: false,
  },
  {
    id: 'package',
    label: 'Package',
    defaultVisible: false,
  },
];
