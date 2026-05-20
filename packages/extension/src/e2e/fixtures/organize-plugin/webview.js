export function activate(api) {
  api.registerGraphViewContributions({
    contextMenu: [
      {
        id: 'e2e.organize.new-section',
        label: 'New Section...',
        placement: { menu: 'create' },
        targets: [{ kind: 'background' }],
        run(context) {
          api.sendMessage({
            type: 'createSection',
            data: {
              position: context.graphPosition ?? { x: 0, y: 0 },
              selectedNodeIds: context.selectedNodeIds,
            },
          });
        },
      },
      {
        id: 'e2e.organize.pin-node',
        label: 'Pin Node',
        targets: [{ kind: 'node' }],
        isVisible(context) {
          return context.selectedNodeIds.length === 1;
        },
        run(context) {
          api.sendMessage({
            type: 'pinNode',
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
  api.sendMessage({ type: 'activated', data: { ok: true } });
}
