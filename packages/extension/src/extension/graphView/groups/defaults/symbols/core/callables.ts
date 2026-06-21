import { mdiCogOutline, mdiFunction, mdiFunctionVariant } from '@mdi/js';
import { createMaterialSymbolIconDataUrl } from '../icons';
import type { SymbolDefaultGroup } from '../model';

export const CALLABLE_SYMBOL_GROUPS: SymbolDefaultGroup[] = [
  { id: 'default:symbol-kind:function', displayLabel: 'Function', color: '#8B5CF6', imageUrl: createMaterialSymbolIconDataUrl(mdiFunction), matchNodeType: 'symbol', matchSymbolKind: 'function' },
  { id: 'default:symbol-kind:method', displayLabel: 'Method', color: '#A855F7', imageUrl: createMaterialSymbolIconDataUrl(mdiFunctionVariant), matchNodeType: 'symbol', matchSymbolKind: 'method' },
  { id: 'default:symbol-kind:constructor', displayLabel: 'Constructor', color: '#C084FC', imageUrl: createMaterialSymbolIconDataUrl(mdiCogOutline), matchNodeType: 'symbol', matchSymbolKind: 'constructor' },
];
