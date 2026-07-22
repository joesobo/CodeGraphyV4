import type { IGraphNodeTypeDefinition } from '../../../contracts';

export function createSymbolRootNodeType(): IGraphNodeTypeDefinition {
  return {
    id: 'symbol',
    label: 'Symbol',
    defaultColor: '#7C3AED',
    defaultVisible: false,
    description: {
      description: 'Quick toggle for all named code elements inside files.',
    },
  };
}
