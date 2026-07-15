import type { IGraphNodeTypeDefinition } from '../../../contracts';
import { createSymbolNodeType } from './definition';

interface SymbolMemberNodeTypes {
  methodNodeType: IGraphNodeTypeDefinition;
  constructorNodeType: IGraphNodeTypeDefinition;
  propertyNodeType: IGraphNodeTypeDefinition;
}

export function createSymbolMemberNodeTypes(): SymbolMemberNodeTypes {
  return {
    methodNodeType: createSymbolNodeType({
      id: 'symbol:method',
      label: 'Method',
      defaultColor: '#A855F7',
      matchSymbolKinds: ['method'],
      description: {
        description: 'Callable members that belong to a class or similar type.',
        examples: [{ label: 'C++', code: 'std::size_t TaskRunner::run() {}' }],
      },
    }),
    constructorNodeType: createSymbolNodeType({
      id: 'symbol:constructor',
      label: 'Constructor',
      defaultColor: '#C084FC',
      matchSymbolKinds: ['constructor'],
      description: {
        description: 'Callable members that initialize a class, struct, or record.',
        examples: [{ label: 'C#', code: 'public TaskDispatcher(ITaskQueue queue) {}' }],
      },
    }),
    propertyNodeType: createSymbolNodeType({
      id: 'symbol:property',
      label: 'Property',
      defaultColor: '#84CC16',
      matchSymbolKinds: ['property'],
      description: {
        description: 'Named class, struct, interface, or record accessors.',
        examples: [{ label: 'C#', code: 'public int Count { get; }' }],
      },
    }),
  };
}
