import type { GraphContextMenuDecision } from './model';
import type { GraphContextNodeTarget } from './targets';

export function classifySingleNodeDecision(target: GraphContextNodeTarget): GraphContextMenuDecision {
  switch (target.nodeKind) {
    case 'file':
      return { kind: 'singleFileNode', target };
    case 'folder':
      return { kind: 'singleFolderNode', target };
    case 'package':
      return { kind: 'singlePackageNode', target };
    case 'plugin':
      return { kind: 'singlePluginNode', target };
  }
}
