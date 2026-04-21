import * as vscodeApiModule from '../../../vscodeApi';

export interface LegendPanelStorageState {
  legendPanelCollapsed?: Record<string, boolean>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readLegendPanelCollapsedState(): Record<string, boolean> {
  const state = vscodeApiModule.getVsCodeApi?.()?.getState();
  if (!isPlainObject(state) || !isPlainObject(state.legendPanelCollapsed)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(state.legendPanelCollapsed).filter((entry): entry is [string, boolean] =>
      typeof entry[1] === 'boolean'
    ),
  );
}

export function writeLegendPanelCollapsedState(
  legendPanelCollapsed: Record<string, boolean>,
): void {
  const vscode = vscodeApiModule.getVsCodeApi?.();
  if (!vscode) {
    return;
  }

  const existingState = vscode.getState();
  const nextState = isPlainObject(existingState) ? existingState : {};
  vscode.setState({
    ...nextState,
    legendPanelCollapsed,
  } satisfies LegendPanelStorageState);
}
