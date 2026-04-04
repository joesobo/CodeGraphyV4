import { IView } from '../contracts';

export const depthGraphView: IView = {
  id: 'codegraphy.depth-graph',
  name: 'Depth Graph',
  icon: 'target',
  description: 'Shows a local graph around the focused file',
  transform(data) {
    return data;
  },
};
