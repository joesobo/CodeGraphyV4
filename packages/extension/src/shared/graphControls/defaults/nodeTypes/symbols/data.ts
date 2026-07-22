import type { IGraphNodeTypeDefinition } from '../../../contracts';
import { createSymbolNodeType } from './definition';

interface SymbolDataNodeTypes {
  recordNodeType: IGraphNodeTypeDefinition;
  typeNodeType: IGraphNodeTypeDefinition;
  structNodeType: IGraphNodeTypeDefinition;
}

export function createSymbolDataNodeTypes(): SymbolDataNodeTypes {
  return {
    recordNodeType: createSymbolNodeType({
      id: 'symbol:record',
      label: 'Record',
      defaultColor: '#6366F1',
      matchSymbolKinds: ['record'],
      description: {
        description: 'Record declarations that define value-oriented types.',
        examples: [{ label: 'C#', code: 'public record DispatchTask(TaskId Id);' }],
      },
    }),
    typeNodeType: createSymbolNodeType({
      id: 'symbol:type',
      label: 'Type',
      defaultColor: '#EC4899',
      matchSymbolKinds: ['type'],
      description: {
        description: 'Type aliases and named type definitions.',
        examples: [{ code: 'type LayoutMode = "free" | "layered";' }],
      },
    }),
    structNodeType: createSymbolNodeType({
      id: 'symbol:struct',
      label: 'Struct',
      defaultColor: '#0EA5E9',
      matchSymbolKinds: ['struct'],
      description: {
        description: 'Struct declarations that define grouped fields or data.',
        examples: [{ code: 'struct GraphNode { id: String }' }],
      },
    }),
  };
}
