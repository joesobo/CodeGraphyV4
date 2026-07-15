import type { IGraphNodeTypeDefinition } from '../../../contracts';
import { createSymbolNodeType } from './definition';

interface SymbolScopeNodeTypes {
  namespaceNodeType: IGraphNodeTypeDefinition;
  classNodeType: IGraphNodeTypeDefinition;
  interfaceNodeType: IGraphNodeTypeDefinition;
}

export function createSymbolScopeNodeTypes(): SymbolScopeNodeTypes {
  return {
    namespaceNodeType: createSymbolNodeType({
      id: 'symbol:namespace',
      label: 'Namespace',
      defaultColor: '#64748B',
      matchSymbolKinds: ['namespace'],
      description: {
        description: 'Named scopes that group related code declarations.',
        examples: [{ label: 'C++', code: 'namespace taskrunner {}' }],
      },
    }),
    classNodeType: createSymbolNodeType({
      id: 'symbol:class',
      label: 'Class',
      defaultColor: '#3B82F6',
      matchSymbolKinds: ['class'],
      description: {
        description: 'Class declarations that group state and behavior.',
        examples: [{ code: 'class GraphRuntime {}' }],
      },
    }),
    interfaceNodeType: createSymbolNodeType({
      id: 'symbol:interface',
      label: 'Interface',
      defaultColor: '#06B6D4',
      matchSymbolKinds: ['interface'],
      description: {
        description: 'Interface declarations that describe a shape or contract.',
        examples: [{ code: 'interface GraphNode { id: string; }' }],
      },
    }),
  };
}
