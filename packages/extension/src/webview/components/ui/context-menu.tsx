/**
 * Context Menu component based on shadcn/ui pattern.
 * Uses Radix UI primitives for accessibility.
 */

import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuGroup = ContextMenuPrimitive.Group;
const ContextMenuPortal = ContextMenuPrimitive.Portal;
const ContextMenuSub = ContextMenuPrimitive.Sub;
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

export { ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuContent } from './context-menu-triggers';
export { ContextMenuItem, ContextMenuCheckboxItem, ContextMenuRadioItem } from './context-menu-items';
export { ContextMenuLabel, ContextMenuSeparator, ContextMenuShortcut } from './context-menu-layout';

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuRadioGroup,
};
