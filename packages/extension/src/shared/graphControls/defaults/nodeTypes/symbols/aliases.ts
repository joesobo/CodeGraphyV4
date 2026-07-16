import type { IGraphNodeTypeDefinition } from '../../../contracts';
import { createSymbolNodeType } from './definition';

interface SymbolAliasNodeTypes {
  typedefNodeType: IGraphNodeTypeDefinition;
  aliasNodeType: IGraphNodeTypeDefinition;
}

export function createSymbolAliasNodeTypes(): SymbolAliasNodeTypes {
  return {
    typedefNodeType: createSymbolNodeType({
      id: 'symbol:typedef',
      label: 'Typedef',
      defaultColor: '#F472B6',
      matchSymbolKinds: ['typedef'],
      description: {
        description: 'C typedef declarations that introduce an alias for a named type.',
        examples: [{ label: 'C', code: 'typedef struct Logger Logger;' }],
      },
    }),
    aliasNodeType: createSymbolNodeType({
      id: 'symbol:alias',
      label: 'Alias',
      defaultColor: '#F472B6',
      matchSymbolKinds: ['alias'],
      description: {
        description: 'Named aliases introduced for another type.',
        examples: [{ label: 'C++', code: 'using TaskId = std::uint64_t;' }],
      },
    }),
  };
}
