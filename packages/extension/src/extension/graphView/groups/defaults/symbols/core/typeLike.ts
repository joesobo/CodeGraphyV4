import {
  mdiAlphaCBoxOutline,
  mdiAlphaIBoxOutline,
  mdiAlphaTBoxOutline,
  mdiCubeOutline,
  mdiFormatListBulletedType,
} from '@mdi/js';
import { createMaterialSymbolIconDataUrl } from '../icons';
import type { SymbolDefaultGroup } from '../model';

export const TYPE_LIKE_SYMBOL_GROUPS: SymbolDefaultGroup[] = [
  { id: 'default:symbol-kind:class', displayLabel: 'Class', color: '#3B82F6', imageUrl: createMaterialSymbolIconDataUrl(mdiAlphaCBoxOutline), matchNodeType: 'symbol', matchSymbolKind: 'class' },
  { id: 'default:symbol-kind:interface', displayLabel: 'Interface', color: '#06B6D4', imageUrl: createMaterialSymbolIconDataUrl(mdiAlphaIBoxOutline), matchNodeType: 'symbol', matchSymbolKind: 'interface' },
  { id: 'default:symbol-kind:type', displayLabel: 'Type', color: '#EC4899', imageUrl: createMaterialSymbolIconDataUrl(mdiAlphaTBoxOutline), matchNodeType: 'symbol', matchSymbolKind: 'type' },
  { id: 'default:symbol-kind:struct', displayLabel: 'Struct', color: '#0EA5E9', imageUrl: createMaterialSymbolIconDataUrl(mdiCubeOutline), matchNodeType: 'symbol', matchSymbolKind: 'struct' },
  { id: 'default:symbol-kind:enum', displayLabel: 'Enum', color: '#F59E0B', imageUrl: createMaterialSymbolIconDataUrl(mdiFormatListBulletedType), matchNodeType: 'symbol', matchSymbolKind: 'enum' },
];
