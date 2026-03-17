import type { GraphViewProvider } from './graphViewProvider';
import { getNavCommands } from './commandHandlersNav';
import { getExportCommands } from './commandHandlersExport';

export interface CommandDefinition {
  id: string;
  handler: () => void | Promise<void>;
}

/** Returns all CodeGraphy command definitions. */
export function getCommandDefinitions(provider: GraphViewProvider): CommandDefinition[] {
  return [...getNavCommands(provider), ...getExportCommands(provider)];
}
