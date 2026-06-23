import type { DiagnosticEvent } from '../contracts';
import { formatAnalysisEvent } from './events/analysis';
import { formatCommandEvent } from './events/command';
import {
  formatExtensionLifecycleEvent,
  formatExtensionWebviewEvent,
} from './events/extension';
import { formatGraphQueryEvent } from './events/graphQuery';
import {
  formatIndexingEvent,
} from './events/indexing';
import { formatWorkspaceEvent } from './events/workspace';

export function formatKnownEvent(event: DiagnosticEvent): string | undefined {
  if (event.area === 'cli') {
    return formatCommandEvent(event.event, event.context);
  }

  if (event.area === 'extension.analysis') {
    return formatAnalysisEvent(event.event, event.context);
  }

  if (event.area === 'workspace') {
    return formatWorkspaceEvent(event.event, event.context);
  }

  if (event.area === 'indexing') {
    return formatIndexingEvent(event.event, event.context);
  }

  if (event.area === 'graph-query') {
    return formatGraphQueryEvent(event.event, event.context);
  }

  if (event.area === 'extension.lifecycle') {
    return formatExtensionLifecycleEvent(event.event, event.context);
  }

  if (event.area === 'extension.webview') {
    return formatExtensionWebviewEvent(event.event, event.context);
  }

  return undefined;
}
