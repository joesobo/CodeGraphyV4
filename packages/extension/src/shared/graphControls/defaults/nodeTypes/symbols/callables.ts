import type { IGraphNodeTypeDefinition } from '../../../contracts';
import { createSymbolNodeType } from './definition';

interface SymbolCallableNodeTypes {
  functionNodeType: IGraphNodeTypeDefinition;
  callableNodeType: IGraphNodeTypeDefinition;
  prototypeNodeType: IGraphNodeTypeDefinition;
}

export function createSymbolCallableNodeTypes(): SymbolCallableNodeTypes {
  return {
    functionNodeType: createSymbolNodeType({
      id: 'symbol:function',
      label: 'Function',
      defaultColor: '#8B5CF6',
      matchSymbolKinds: ['function', 'method'],
      description: {
        description: 'Callable code blocks such as functions, methods, or procedures.',
        examples: [{ code: 'function parseSettings() {}' }],
      },
    }),
    callableNodeType: createSymbolNodeType({
      id: 'symbol:callable',
      label: 'Callable',
      defaultColor: '#8B5CF6',
      matchSymbolKinds: ['function'],
      description: {
        description: 'Free functions and other callable declarations that are not class methods.',
        examples: [{ label: 'C++', code: 'TaskList seed_tasks();' }],
      },
    }),
    prototypeNodeType: createSymbolNodeType({
      id: 'symbol:prototype',
      label: 'Prototype',
      defaultColor: '#A78BFA',
      matchSymbolKinds: ['prototype'],
      description: {
        description: 'Function declarations without bodies, such as C prototypes.',
        examples: [{ label: 'C', code: 'void logger_flush(Logger *logger);' }],
      },
    }),
  };
}
