import type { IGraphNodeTypeDefinition } from '../../../contracts';

type SymbolNodeTypeDefinition = Omit<
  IGraphNodeTypeDefinition,
  'defaultVisible' | 'parentId'
>;

export function createSymbolNodeType(
  definition: SymbolNodeTypeDefinition,
): IGraphNodeTypeDefinition {
  return {
    ...definition,
    defaultVisible: false,
    parentId: 'symbol',
  };
}
