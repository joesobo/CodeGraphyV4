import type { GraphRendererFrame, GraphRendererNodeStyle } from '../../../contracts';
import { NODE_STYLE_FLOATS } from '../../buffer/layout';
import { createNodeRenderOrder, type NodeRenderOrder } from '../order';
import { writeNodeStyle } from './model';

const emptyOrder: NodeRenderOrder = {
  areas: new Float64Array(),
  nodeIndexByRenderedIndex: new Uint32Array(),
  renderedIndexByNodeIndex: new Int32Array(),
};

export class NodeStyleBuffer {
  order = emptyOrder;
  styles: GraphRendererNodeStyle[] = [];
  values = new Float32Array();

  update(frame: GraphRendererFrame): boolean {
    const styles = frame.nodes.map(node => frame.getNodeStyle(node));
    const result = createNodeRenderOrder(styles, this.order.areas);
    this.order = result.order;
    this.styles = styles;
    this.values = new Float32Array(styles.length * NODE_STYLE_FLOATS);
    for (let renderedIndex = 0; renderedIndex < styles.length; renderedIndex += 1) {
      const nodeIndex = this.order.nodeIndexByRenderedIndex[renderedIndex];
      writeNodeStyle(this.values, renderedIndex, styles[nodeIndex]);
    }
    return result.changed;
  }
}
