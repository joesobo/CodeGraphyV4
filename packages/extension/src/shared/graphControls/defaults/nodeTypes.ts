import type { IGraphNodeTypeDefinition } from '../contracts';
import { createStructuralGraphNodeTypes } from './nodeTypes/structural';
import { createSymbolGraphNodeTypes } from './nodeTypes/symbols';
import { createVariableGraphNodeTypes } from './nodeTypes/variables';

export function createCoreGraphNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
    ...createStructuralGraphNodeTypes(),
    ...createSymbolGraphNodeTypes(),
    ...createVariableGraphNodeTypes(),
  ];
}

export const CORE_GRAPH_NODE_TYPES: IGraphNodeTypeDefinition[] = createCoreGraphNodeTypes();
