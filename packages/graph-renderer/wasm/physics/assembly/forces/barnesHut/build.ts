import { accumulateTree } from './accumulate';
import { allocateCell } from './cellAllocation';
import { initializeExtent, resetBuild, scanVisibleNodes } from './buildScan';
import { insertVisibleNodes } from './insertion';
import { overflowed, setRoot } from './treeState';

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
