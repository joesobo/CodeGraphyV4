import { mdiEarth, mdiLockOutline, mdiVariable } from '@mdi/js';
import { createMaterialSymbolIconDataUrl } from '../icons';
import type { SymbolDefaultGroup } from '../model';

export const VARIABLE_SYMBOL_GROUPS: SymbolDefaultGroup[] = [
  { id: 'default:symbol-kind:variable', displayLabel: 'Variable', color: '#14B8A6', imageUrl: createMaterialSymbolIconDataUrl(mdiVariable), matchNodeType: 'variable', matchSymbolKind: 'variable' },
  { id: 'default:symbol-kind:constant', displayLabel: 'Constant', color: '#22C55E', imageUrl: createMaterialSymbolIconDataUrl(mdiLockOutline), matchNodeType: 'variable', matchSymbolKind: 'constant' },
  { id: 'default:symbol-kind:global', displayLabel: 'Global', color: '#0D9488', imageUrl: createMaterialSymbolIconDataUrl(mdiEarth), matchNodeType: 'variable', matchSymbolKind: 'global' },
];
