import type { IGraphNodeTypeDefinition } from '../contracts';
import { createStructuralGraphNodeTypes } from './nodeTypes/structural';
import { createSymbolGraphNodeTypes } from './nodeTypes/symbols';
import { createUnityGraphNodeTypes } from './nodeTypes/unity';
import { createVariableGraphNodeTypes } from './nodeTypes/variables';

export function createCoreGraphNodeTypes(): IGraphNodeTypeDefinition[] {
  return [
    ...createStructuralGraphNodeTypes(),
    ...createSymbolGraphNodeTypes(),
    ...createVariableGraphNodeTypes(),
    ...createUnityGraphNodeTypes(),
  ];
}

export const CORE_GRAPH_NODE_TYPES: IGraphNodeTypeDefinition[] = createCoreGraphNodeTypes();
