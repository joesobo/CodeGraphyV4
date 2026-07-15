import { accumulateTree } from '../charge/accumulate';
import { allocateCell } from '../insertion/allocation';
import { insertVisibleNodes } from '../insertion/insert';
import { overflowed, setRoot } from '../tree/state';
import { initializeExtent, resetBuild, scanVisibleNodes } from './scan';

export function rebuildBarnesHutTree(globalChargeStrength: f64): bool {
  resetBuild();
  if (!scanVisibleNodes(globalChargeStrength)) return true;
  initializeExtent();
  setRoot(allocateCell());
  if (overflowed()) return false;
  insertVisibleNodes();
  if (overflowed()) return false;
  accumulateTree();
  return true;
}
