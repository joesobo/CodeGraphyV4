import type { IGraphNode } from '@codegraphy-vscode/plugin-api';

export interface RankedNode {
  node: IGraphNode;
  linkCount: number;
  neighborCount: number;
}

