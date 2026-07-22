import type { IGraphNodeTypeDefinition } from '../../../contracts';
import { createSymbolNodeType } from './definition';

interface SymbolSumTypeNodeTypes {
  unionNodeType: IGraphNodeTypeDefinition;
  enumNodeType: IGraphNodeTypeDefinition;
}

export function createSymbolSumTypeNodeTypes(): SymbolSumTypeNodeTypes {
  return {
    unionNodeType: createSymbolNodeType({
      id: 'symbol:union',
      label: 'Union',
      defaultColor: '#14B8A6',
      matchSymbolKinds: ['union'],
      description: {
        description: 'Union declarations that store one of several field layouts in shared storage.',
        examples: [{ label: 'C', code: 'union LogMessage { const char *text; int code; }' }],
      },
    }),
    enumNodeType: createSymbolNodeType({
      id: 'symbol:enum',
      label: 'Enum',
      defaultColor: '#F59E0B',
      matchSymbolKinds: ['enum'],
      description: {
        description: 'Enum declarations that define a named set of values.',
        examples: [{ code: 'enum LayoutMode { Free, Layered }' }],
      },
    }),
  };
}
