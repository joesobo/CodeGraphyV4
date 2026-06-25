import type { DiagnosticContextValue } from '../../contracts';
import {
  formatContextDetail,
  formatScalar,
  joinDetails,
} from '../parts';

export function formatCommandEvent(
  event: string,
  context: Record<string, DiagnosticContextValue> | undefined,
): string | undefined {
  const command = formatScalar(context?.command);
  if (event === 'command-started') {
    const details = joinDetails([
      command,
      formatContextDetail(context, 'action'),
      formatContextDetail(context, 'workspacePath', 'workspace'),
    ]);
    return details ? `Starting command: ${details}` : 'Starting command';
  }

  if (event === 'command-completed') {
    const details = joinDetails([
      command,
      formatContextDetail(context, 'exitCode'),
    ]);
    return details ? `Command complete: ${details}` : 'Command complete';
  }

  return undefined;
}
