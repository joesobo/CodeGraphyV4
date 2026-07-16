import type { IGraphNodeTypeDefinition } from '../../../contracts';
import { createSymbolNodeType } from './definition';

interface SymbolEventNodeTypes {
  delegateNodeType: IGraphNodeTypeDefinition;
  eventNodeType: IGraphNodeTypeDefinition;
}

export function createSymbolEventNodeTypes(): SymbolEventNodeTypes {
  return {
    delegateNodeType: createSymbolNodeType({
      id: 'symbol:delegate',
      label: 'Delegate',
      defaultColor: '#10B981',
      matchSymbolKinds: ['delegate'],
      description: {
        description: 'Named callable signatures that can be assigned or invoked.',
        examples: [{ label: 'C#', code: 'public delegate void TaskCompleted();' }],
      },
    }),
    eventNodeType: createSymbolNodeType({
      id: 'symbol:event',
      label: 'Event',
      defaultColor: '#F97316',
      matchSymbolKinds: ['event'],
      description: {
        description: 'Named event members that notify subscribers.',
        examples: [{ label: 'C#', code: 'public event TaskCompleted? Completed;' }],
      },
    }),
  };
}
