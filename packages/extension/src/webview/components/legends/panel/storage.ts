import { unknownRecordSchema } from '../../../../shared/values';
import * as vscodeApiModule from '../../../vscodeApi';

export interface LegendPanelStorageState {
  legendPanelCollapsed?: Record<string, boolean>;
}

function readBooleanRecord(value: unknown): Record<string, boolean> {
  const parsed = unknownRecordSchema.safeParse(value);
  if (!parsed.success) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(parsed.data).filter((entry): entry is [string, boolean] =>
      typeof entry[1] === 'boolean'
    ),
  );
}

export function readLegendPanelCollapsedState(): Record<string, boolean> {
  const state = unknownRecordSchema.safeParse(vscodeApiModule.getVsCodeApi?.()?.getState());
  if (!state.success) {
    return {};
  }

  return readBooleanRecord(state.data.legendPanelCollapsed);
}

export function writeLegendPanelCollapsedState(
  legendPanelCollapsed: Record<string, boolean>,
): void {
  const vscode = vscodeApiModule.getVsCodeApi?.();
  if (!vscode) {
    return;
  }

  const existingState = unknownRecordSchema.safeParse(vscode.getState());
  const nextState = existingState.success ? existingState.data : {};
  vscode.setState({
    ...nextState,
    legendPanelCollapsed,
  } satisfies LegendPanelStorageState);
}
