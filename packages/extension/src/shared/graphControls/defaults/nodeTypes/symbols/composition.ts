import type { IGraphNodeTypeDefinition } from '../../../contracts';
import { createSymbolNodeType } from './definition';

interface SymbolCompositionNodeTypes {
  mixinNodeType: IGraphNodeTypeDefinition;
  extensionNodeType: IGraphNodeTypeDefinition;
  templateNodeType: IGraphNodeTypeDefinition;
}

export function createSymbolCompositionNodeTypes(): SymbolCompositionNodeTypes {
  return {
    mixinNodeType: createSymbolNodeType({
      id: 'symbol:mixin',
      label: 'Mixin',
      defaultColor: '#2563EB',
      matchSymbolKinds: ['mixin'],
      description: {
        description: 'Named behavior fragments that can be composed into classes.',
        examples: [{ label: 'Dart', code: 'mixin Runnable {}' }],
      },
    }),
    extensionNodeType: createSymbolNodeType({
      id: 'symbol:extension',
      label: 'Extension',
      defaultColor: '#4F46E5',
      matchSymbolKinds: ['extension'],
      description: {
        description: 'Named declarations that add behavior to an existing type.',
        examples: [{ label: 'Dart', code: 'extension ProfileAudit on Profile {}' }],
      },
    }),
    templateNodeType: createSymbolNodeType({
      id: 'symbol:template',
      label: 'Template',
      defaultColor: '#C084FC',
      matchSymbolKinds: ['template'],
      description: {
        description: 'Template declarations that define reusable generic code.',
        examples: [{ label: 'C++', code: 'template <typename Item> class TaskQueue {};' }],
      },
    }),
  };
}
