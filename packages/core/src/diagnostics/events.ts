export type DiagnosticContextValue =
  | null
  | string
  | number
  | boolean
  | DiagnosticContextValue[]
  | { [key: string]: DiagnosticContextValue };

export interface DiagnosticEvent {
  area: string;
  event: string;
  context?: Record<string, DiagnosticContextValue>;
}

export interface DiagnosticEventInput {
  area: string;
  event: string;
  context?: Record<string, unknown>;
}

export interface DiagnosticEventSink {
  emit(event: DiagnosticEvent): void;
}

function normalizeError(error: Error): Record<string, DiagnosticContextValue> {
  return {
    name: error.name,
    message: error.message,
  };
}

function normalizeContextValue(value: unknown): DiagnosticContextValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    return normalizeError(value);
  }

  if (Array.isArray(value)) {
    return value.map(normalizeContextValue);
  }

  if (value instanceof Set) {
    return [...value].map(normalizeContextValue);
  }

  if (value instanceof Map) {
    return [...value.entries()].map(([key, entryValue]) => ({
      key: normalizeContextValue(key),
      value: normalizeContextValue(entryValue),
    }));
  }

  if (typeof value === 'object') {
    const normalized: Record<string, DiagnosticContextValue> = {};
    for (const [key, entryValue] of Object.entries(value)) {
      normalized[key] = normalizeContextValue(entryValue);
    }
    return normalized;
  }

  if (typeof value === 'undefined') {
    return 'undefined';
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (typeof value === 'symbol') {
    return value.description ? `Symbol(${value.description})` : 'Symbol()';
  }

  if (typeof value === 'function') {
    return value.name ? `[Function: ${value.name}]` : '[Function]';
  }

  return 'unknown';
}

function normalizeContext(context: Record<string, unknown> | undefined): Record<string, DiagnosticContextValue> | undefined {
  if (!context) {
    return undefined;
  }

  const normalized: Record<string, DiagnosticContextValue> = {};
  for (const [key, value] of Object.entries(context)) {
    normalized[key] = normalizeContextValue(value);
  }
  return normalized;
}

export function createDiagnosticEvent(input: DiagnosticEventInput): DiagnosticEvent {
  return {
    area: input.area,
    event: input.event,
    ...(input.context ? { context: normalizeContext(input.context) } : {}),
  };
}

export function collectDiagnosticEvents(enabled: boolean): DiagnosticEventSink & { readonly events: DiagnosticEvent[] } {
  const events: DiagnosticEvent[] = [];
  return {
    get events(): DiagnosticEvent[] {
      return events;
    },
    emit(event: DiagnosticEvent): void {
      if (enabled) {
        events.push(event);
      }
    },
  };
}

function formatCount(value: DiagnosticContextValue | undefined, noun: string): string | undefined {
  if (typeof value !== 'number') {
    return undefined;
  }
  return `${value} ${noun}${value === 1 ? '' : 's'}`;
}

function formatScalar(value: DiagnosticContextValue | undefined): string | undefined {
  if (value === null || typeof value === 'undefined') {
    return undefined;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function formatContextDetail(
  context: Record<string, DiagnosticContextValue> | undefined,
  key: string,
  label: string = key,
): string | undefined {
  const value = formatScalar(context?.[key]);
  return value ? `${label}=${value}` : undefined;
}

function joinDetails(details: Array<string | undefined>): string {
  return details.filter((detail): detail is string => Boolean(detail)).join(', ');
}

function formatStatusRead(context: Record<string, DiagnosticContextValue> | undefined): string {
  const state = formatScalar(context?.state);
  const cacheDescription = state ? `${state} Graph Cache` : 'Graph Cache';
  const details = joinDetails([
    formatContextDetail(context, 'workspaceRoot', 'workspace'),
    formatContextDetail(context, 'graphCache', 'cache'),
    formatContextDetail(context, 'enabledPluginCount', 'plugins'),
  ]);
  return details
    ? `Workspace status read: ${cacheDescription}, ${details}`
    : `Workspace status read: ${cacheDescription}`;
}

function formatIndexingComplete(context: Record<string, DiagnosticContextValue> | undefined): string {
  const counts = joinDetails([
    formatCount(context?.files, 'file'),
    formatCount(context?.nodes, 'node'),
    formatCount(context?.edges, 'edge'),
  ]);
  const details = joinDetails([
    counts,
    formatContextDetail(context, 'durationMs', 'durationMs'),
    formatContextDetail(context, 'operationId', 'operation'),
    formatContextDetail(context, 'graphCache', 'cache'),
  ]);
  return details ? `Indexing complete: ${details}` : 'Indexing complete';
}

function formatIndexingPhaseCompleted(context: Record<string, DiagnosticContextValue> | undefined): string {
  const details = joinDetails([
    formatContextDetail(context, 'phase'),
    formatContextDetail(context, 'durationMs', 'durationMs'),
    formatContextDetail(context, 'files'),
    formatContextDetail(context, 'directories'),
    formatContextDetail(context, 'totalFound', 'totalFound'),
    formatContextDetail(context, 'limitReached', 'limitReached'),
    formatContextDetail(context, 'cacheHits', 'cacheHits'),
    formatContextDetail(context, 'cacheMisses', 'cacheMisses'),
    formatContextDetail(context, 'nodes'),
    formatContextDetail(context, 'edges'),
    formatContextDetail(context, 'loadedPackagePlugins', 'loadedPackagePlugins'),
    formatContextDetail(context, 'registeredPlugins', 'registeredPlugins'),
  ]);
  return details ? `Indexing phase complete: ${details}` : 'Indexing phase complete';
}

function formatCommandEvent(
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

function formatAnalysisEvent(
  event: string,
  context: Record<string, DiagnosticContextValue> | undefined,
): string | undefined {
  if (event === 'request-started') {
    return `Starting analysis: ${joinDetails([
      formatContextDetail(context, 'requestId', 'request'),
      formatContextDetail(context, 'mode'),
      formatContextDetail(context, 'filterPatternCount', 'filters'),
      formatContextDetail(context, 'disabledPluginCount', 'disabledPlugins'),
    ])}`;
  }

  if (event === 'request-completed') {
    return `Analysis complete: ${joinDetails([
      formatContextDetail(context, 'requestId', 'request'),
      formatContextDetail(context, 'mode'),
      formatContextDetail(context, 'durationMs', 'durationMs'),
    ])}`;
  }

  if (event === 'request-failed') {
    return `Analysis failed: ${joinDetails([
      formatContextDetail(context, 'requestId', 'request'),
      formatContextDetail(context, 'mode'),
      formatContextDetail(context, 'durationMs', 'durationMs'),
      formatContextDetail(context, 'error'),
    ])}`;
  }

  if (event === 'load-decision') {
    return `Analysis load decision: ${joinDetails([
      formatContextDetail(context, 'route'),
      formatContextDetail(context, 'mode'),
      formatContextDetail(context, 'shouldDiscover'),
      formatContextDetail(context, 'canReplayCache'),
      formatContextDetail(context, 'indexFreshness', 'freshness'),
    ])}`;
  }

  return undefined;
}

function formatKnownEvent(event: DiagnosticEvent): string | undefined {
  const context = event.context;

  if (event.area === 'cli') {
    return formatCommandEvent(event.event, context);
  }

  if (event.area === 'workspace' && event.event === 'index-started') {
    return `Starting indexing: ${joinDetails([
      formatContextDetail(context, 'workspaceRoot', 'workspace'),
      formatContextDetail(context, 'operationId', 'operation'),
    ])}`;
  }

  if (event.area === 'workspace' && event.event === 'status-read') {
    return formatStatusRead(context);
  }

  if (event.area === 'indexing' && event.event === 'completed') {
    return formatIndexingComplete(context);
  }

  if (event.area === 'indexing' && event.event === 'phase-completed') {
    return formatIndexingPhaseCompleted(context);
  }

  if (event.area === 'graph-query' && event.event === 'started') {
    return `Starting Graph Query: ${joinDetails([
      formatContextDetail(context, 'report'),
      formatContextDetail(context, 'operationId', 'operation'),
      formatContextDetail(context, 'workspaceRoot', 'workspace'),
    ])}`;
  }

  if (event.area === 'graph-query' && event.event === 'cache-missing') {
    return `Graph Cache missing: ${joinDetails([
      formatContextDetail(context, 'report'),
      formatContextDetail(context, 'cacheState'),
      formatContextDetail(context, 'operationId', 'operation'),
      formatContextDetail(context, 'workspaceRoot', 'workspace'),
    ])}`;
  }

  if (event.area === 'graph-query' && event.event === 'completed') {
    return `Graph Query complete: ${joinDetails([
      formatContextDetail(context, 'report'),
      formatCount(context?.nodeCount, 'node'),
      formatCount(context?.edgeCount, 'edge'),
      formatContextDetail(context, 'durationMs', 'durationMs'),
      formatContextDetail(context, 'operationId', 'operation'),
    ])}`;
  }

  if (event.area === 'extension.lifecycle' && event.event === 'activation-started') {
    return `Extension activation started: ${joinDetails([
      formatContextDetail(context, 'workspaceFolders'),
    ])}`;
  }

  if (event.area === 'extension.lifecycle' && event.event === 'activation-completed') {
    return `Extension activation complete: ${joinDetails([
      formatContextDetail(context, 'registeredWebviewProviders'),
    ])}`;
  }

  if (event.area === 'extension.webview' && event.event === 'ready-replayed') {
    return `Webview ready replayed: ${joinDetails([
      formatContextDetail(context, 'hasWorkspace'),
      formatContextDetail(context, 'firstAnalysis'),
      formatContextDetail(context, 'readyNotified'),
      formatContextDetail(context, 'maxFiles'),
    ])}`;
  }

  if (event.area === 'extension.webview' && event.event === 'bootstrap-completed') {
    return `Webview bootstrap complete: ${joinDetails([
      formatContextDetail(context, 'hasWorkspace'),
      formatContextDetail(context, 'firstAnalysis'),
      formatContextDetail(context, 'readyNotified'),
    ])}`;
  }

  if (event.area === 'extension.analysis') {
    return formatAnalysisEvent(event.event, context);
  }

  return undefined;
}

function humanizeEventName(event: string): string {
  return event
    .split('-')
    .filter(Boolean)
    .map((part, index) => index === 0
      ? `${part.charAt(0).toUpperCase()}${part.slice(1)}`
      : part)
    .join(' ');
}

function formatFallbackEvent(event: DiagnosticEvent): string {
  const details = joinDetails([
    formatContextDetail({ area: event.area }, 'area'),
    ...Object.keys(event.context ?? {}).map(key => formatContextDetail(event.context, key)),
  ]);
  const message = humanizeEventName(event.event);
  return details ? `${message}: ${details}` : message;
}

export function formatDiagnosticEventLine(event: DiagnosticEvent): string {
  return `[CodeGraphy] ${formatKnownEvent(event) ?? formatFallbackEvent(event)}`;
}
