import type { IView } from '../contracts';
export { MAX_DEPTH_LIMIT, MIN_DEPTH_LIMIT } from './limits';
export {
  getDepthGraphEffectiveDepthLimit,
  getDepthGraphMaxDepthLimit,
} from './transform';
import { filterDepthGraph } from './transform';

export const depthGraphView: IView = {
  id: 'codegraphy.depth-graph',
  name: 'Depth Graph',
  icon: 'target',
  description: 'Shows a local graph around the focused file',
  recomputeOn: ['focusedFile', 'depthLimit'],
  transform: filterDepthGraph,
};
