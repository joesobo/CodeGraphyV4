import type { IGraphNodeTypeDefinition } from '../contracts';

export const CORE_FILE_NODE_TYPES: IGraphNodeTypeDefinition[] = [
  {
    id: 'file',
    label: 'File',
    defaultColor: '#67E8F9',
    defaultVisible: true,
  },
  {
    id: 'folder',
    label: 'Folder',
    defaultColor: '#94A3B8',
    defaultVisible: false,
  },
  {
    id: 'package',
    label: 'Package',
    defaultColor: '#A78BFA',
    defaultVisible: false,
  },
];
