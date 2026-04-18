export interface GraphSurface3dErrorMessage {
  payload: { message: string };
  type: 'GRAPH_3D_UNAVAILABLE';
}

export function handleGraphSurface3dError({
  error,
  postGraphMessage,
  setGraphMode,
}: {
  error: Error;
  postGraphMessage(this: void, message: GraphSurface3dErrorMessage): void;
  setGraphMode(this: void, mode: '2d' | '3d'): void;
}): void {
  console.error('[CodeGraphy] 3D graph unavailable, falling back to 2D.', error);
  postGraphMessage({
    type: 'GRAPH_3D_UNAVAILABLE',
    payload: {
      message: error.message,
    },
  });
  setGraphMode('2d');
}
