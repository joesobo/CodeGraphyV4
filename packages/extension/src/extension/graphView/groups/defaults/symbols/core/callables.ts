import { mdiFunction } from '@mdi/js';
import { createMaterialSymbolIconDataUrl } from '../icons';
import type { SymbolDefaultGroup } from '../model';

export const CALLABLE_SYMBOL_GROUPS: SymbolDefaultGroup[] = [
  { id: 'default:symbol-kind:function', displayLabel: 'Function', color: '#8B5CF6', imageUrl: createMaterialSymbolIconDataUrl(mdiFunction), matchNodeType: 'symbol', matchSymbolKinds: ['function', 'method'] },
];
