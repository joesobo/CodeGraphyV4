import {
  mdiAlphaCBoxOutline,
  mdiAlphaIBoxOutline,
  mdiAlphaTBoxOutline,
  mdiBellOutline,
  mdiCardTextOutline,
  mdiCubeOutline,
  mdiFormatListBulletedType,
  mdiIdentifier,
  mdiLambda,
  mdiScriptTextOutline,
  mdiTagOutline,
  mdiVectorUnion,
} from '@mdi/js';
import { createMaterialSymbolIconDataUrl } from '../icons';
import type { SymbolDefaultGroup } from '../model';

export const TYPE_LIKE_SYMBOL_GROUPS: SymbolDefaultGroup[] = [
  { id: 'default:symbol-kind:prototype', displayLabel: 'Prototype', color: '#A78BFA', imageUrl: createMaterialSymbolIconDataUrl(mdiIdentifier), matchNodeType: 'symbol', matchSymbolKind: 'prototype' },
  { id: 'default:symbol-kind:class', displayLabel: 'Class', color: '#3B82F6', imageUrl: createMaterialSymbolIconDataUrl(mdiAlphaCBoxOutline), matchNodeType: 'symbol', matchSymbolKind: 'class' },
  { id: 'default:symbol-kind:interface', displayLabel: 'Interface', color: '#06B6D4', imageUrl: createMaterialSymbolIconDataUrl(mdiAlphaIBoxOutline), matchNodeType: 'symbol', matchSymbolKind: 'interface' },
  { id: 'default:symbol-kind:record', displayLabel: 'Record', color: '#6366F1', imageUrl: createMaterialSymbolIconDataUrl(mdiCardTextOutline), matchNodeType: 'symbol', matchSymbolKind: 'record' },
  { id: 'default:symbol-kind:delegate', displayLabel: 'Delegate', color: '#10B981', imageUrl: createMaterialSymbolIconDataUrl(mdiLambda), matchNodeType: 'symbol', matchSymbolKind: 'delegate' },
  { id: 'default:symbol-kind:type', displayLabel: 'Type', color: '#EC4899', imageUrl: createMaterialSymbolIconDataUrl(mdiAlphaTBoxOutline), matchNodeType: 'symbol', matchSymbolKind: 'type' },
  { id: 'default:symbol-kind:struct', displayLabel: 'Struct', color: '#0EA5E9', imageUrl: createMaterialSymbolIconDataUrl(mdiCubeOutline), matchNodeType: 'symbol', matchSymbolKind: 'struct' },
  { id: 'default:symbol-kind:union', displayLabel: 'Union', color: '#14B8A6', imageUrl: createMaterialSymbolIconDataUrl(mdiVectorUnion), matchNodeType: 'symbol', matchSymbolKind: 'union' },
  { id: 'default:symbol-kind:enum', displayLabel: 'Enum', color: '#F59E0B', imageUrl: createMaterialSymbolIconDataUrl(mdiFormatListBulletedType), matchNodeType: 'symbol', matchSymbolKind: 'enum' },
  { id: 'default:symbol-kind:typedef', displayLabel: 'Typedef', color: '#F472B6', imageUrl: createMaterialSymbolIconDataUrl(mdiAlphaTBoxOutline), matchNodeType: 'symbol', matchSymbolKind: 'typedef' },
  { id: 'default:symbol-kind:alias', displayLabel: 'Alias', color: '#F472B6', imageUrl: createMaterialSymbolIconDataUrl(mdiTagOutline), matchNodeType: 'symbol', matchSymbolKind: 'alias' },
  { id: 'default:symbol-kind:template', displayLabel: 'Template', color: '#C084FC', imageUrl: createMaterialSymbolIconDataUrl(mdiScriptTextOutline), matchNodeType: 'symbol', matchSymbolKind: 'template' },
  { id: 'default:symbol-kind:property', displayLabel: 'Property', color: '#84CC16', imageUrl: createMaterialSymbolIconDataUrl(mdiIdentifier), matchNodeType: 'symbol', matchSymbolKind: 'property' },
  { id: 'default:symbol-kind:event', displayLabel: 'Event', color: '#F97316', imageUrl: createMaterialSymbolIconDataUrl(mdiBellOutline), matchNodeType: 'symbol', matchSymbolKind: 'event' },
];
