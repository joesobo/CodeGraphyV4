import type { IGraphNodeTypeDefinition } from '../contracts';
import { CORE_FILE_NODE_TYPES } from './fileNodeTypes';
import { CORE_SYMBOL_NODE_TYPES } from './symbolNodeTypes';
import { CORE_VARIABLE_NODE_TYPES } from './variableNodeTypes';

export const CORE_GRAPH_NODE_TYPES: IGraphNodeTypeDefinition[] = [
  ...CORE_FILE_NODE_TYPES,
  ...CORE_SYMBOL_NODE_TYPES,
  ...CORE_VARIABLE_NODE_TYPES,
];
