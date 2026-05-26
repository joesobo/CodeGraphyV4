import { CALLABLE_SYMBOL_GROUPS } from './core/callables';
import { TYPE_LIKE_SYMBOL_GROUPS } from './core/typeLike';
import { VARIABLE_SYMBOL_GROUPS } from './core/variables';
import type { SymbolDefaultGroup } from './model';

export const CORE_SYMBOL_GROUPS: SymbolDefaultGroup[] = [
  ...CALLABLE_SYMBOL_GROUPS,
  ...TYPE_LIKE_SYMBOL_GROUPS,
  ...VARIABLE_SYMBOL_GROUPS,
];
