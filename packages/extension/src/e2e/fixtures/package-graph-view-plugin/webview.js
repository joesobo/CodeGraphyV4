export function activate(api) {
  api.registerGraphViewContributions({
    contextMenu: [
      {
        id: 'e2e.graph-view-plugin.create-item',
        label: 'New Plugin Item...',
        placement: { menu: 'create' },
        targets: [{ kind: 'background' }],
        run(context) {
          api.setPluginData({
            type: 'createItem',
            data: {
              position: context.graphPosition ?? { x: 0, y: 0 },
              selectedNodeIds: context.selectedNodeIds,
            },
          });
        },
      },
      {
        id: 'e2e.graph-view-plugin.node-action',
        label: 'Plugin Node Action',
        targets: [{ kind: 'node' }],
        isVisible(context) {
          return context.selectedNodeIds.length === 1;
        },
        run(context) {
          api.setPluginData({
            type: 'nodeAction',
            data: {
              nodeId: context.selectedNodeIds[0],
              position: context.selectedNodePositions?.[context.selectedNodeIds[0]]
                ?? context.graphPosition
                ?? { x: 0, y: 0 },
            },
          });
        },
      },
    ],
  });
  api.setPluginData({ type: 'activated', data: { ok: true } });
}
