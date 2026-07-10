import { z } from 'zod';

export const perfScenarioSchema = z.enum([
  'cold-open',
  'warm-open',
  'single-save',
  'rename',
  'create',
  'delete',
  'batch-100',
  'interaction-burst',
  'scope-toggle',
  'idle-watch',
]);

const identifierSchema = z.string().trim().min(1);
const nonnegativeFiniteNumberSchema = z.number().finite().nonnegative();
const nonnegativeIntegerSchema = z.number().int().nonnegative();
const scopeKindSchema = z.enum(['node', 'edge']);

const scopeEntryShape = {
  scopeKind: scopeKindSchema,
  scopeId: identifierSchema,
  enabled: z.boolean(),
} as const;

export const perfScopeVisibilitySnapshotSchema = z.strictObject({
  edgeVisibility: z.record(identifierSchema, z.boolean()),
  nodeVisibility: z.record(identifierSchema, z.boolean()),
});

export const perfRenderReadyRequestMessageSchema = z.strictObject({
  type: z.literal('PERF_RENDER_READY_REQUEST'),
  payload: z.strictObject({
    graphRevision: nonnegativeIntegerSchema.default(0),
    requestId: identifierSchema,
  }),
});

export const perfRenderReadyMessageSchema = z.strictObject({
  type: z.literal('PERF_RENDER_READY'),
  payload: z.strictObject({
    graphRevision: nonnegativeIntegerSchema.default(0),
    requestId: identifierSchema,
    // Counts describe the projected graph painted by react-force-graph. The
    // graph revision, not raw payload counts, correlates source updates.
    nodeCount: nonnegativeIntegerSchema,
    edgeCount: nonnegativeIntegerSchema,
  }),
});

const perfOperationShape = {
  operationId: identifierSchema,
  runId: identifierSchema,
  scenario: perfScenarioSchema,
  dimension: identifierSchema,
} as const;

export const perfOperationSchema = z.strictObject(perfOperationShape);

export const perfControlMessageSchema = z.strictObject({
  type: z.literal('PERF_CONTROL'),
  payload: z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('arm-graph'),
      operation: perfOperationSchema,
    }),
    z.strictObject({
      kind: z.literal('disarm-graph'),
      operationId: identifierSchema,
    }),
    z.strictObject({
      kind: z.literal('run-interaction-burst'),
      operationId: identifierSchema,
    }),
    z.strictObject({
      kind: z.literal('run-idle-watch'),
      operationId: identifierSchema,
      durationMs: z.number().finite().positive().optional(),
    }),
    z.strictObject({
      kind: z.literal('request-scope-inventory'),
      operationId: identifierSchema,
    }),
    z.strictObject({
      kind: z.literal('toggle-scope'),
      operationId: identifierSchema,
      ...scopeEntryShape,
    }),
  ]),
});

const perfEventContextShape = { ...perfOperationShape };
const metricEventSchema = z.discriminatedUnion('metric', [
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('metric'),
    metric: z.literal('payloadBytes'),
    value: nonnegativeFiniteNumberSchema,
    unit: z.literal('bytes'),
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('metric'),
    metric: z.literal('layoutResets'),
    value: nonnegativeFiniteNumberSchema,
    unit: z.literal('count'),
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('metric'),
    metric: z.literal('scopeToggleMs'),
    value: nonnegativeFiniteNumberSchema,
    unit: z.literal('ms'),
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('metric'),
    metric: z.literal('settleTimeMs'),
    value: nonnegativeFiniteNumberSchema,
    unit: z.literal('ms'),
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('metric'),
    metric: z.literal('simTicksAfterSettle'),
    value: nonnegativeFiniteNumberSchema,
    unit: z.literal('count'),
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('metric'),
    metric: z.literal('fpsIdle'),
    value: nonnegativeFiniteNumberSchema,
    unit: z.literal('fps'),
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('metric'),
    metric: z.literal('fpsDrag'),
    value: nonnegativeFiniteNumberSchema,
    unit: z.literal('fps'),
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('metric'),
    metric: z.literal('fpsSettle'),
    value: nonnegativeFiniteNumberSchema,
    unit: z.literal('fps'),
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('metric'),
    metric: z.literal('longTasksPerInteraction'),
    value: nonnegativeFiniteNumberSchema,
    unit: z.literal('count'),
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('metric'),
    metric: z.literal('heapUsedBytes'),
    value: nonnegativeFiniteNumberSchema,
    unit: z.literal('bytes'),
  }),
]);

export const perfEventPayloadSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('graph-applied'),
    layoutChanged: z.boolean(),
    nodeCount: nonnegativeIntegerSchema,
    edgeCount: nonnegativeIntegerSchema,
    scopeProjectionRevision: nonnegativeIntegerSchema,
    scopeVisibility: perfScopeVisibilitySnapshotSchema.optional(),
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('physics-settled'),
    scopeProjectionRevision: nonnegativeIntegerSchema,
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('idle-started'),
    durationMs: nonnegativeFiniteNumberSchema,
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('scope-inventory'),
    entries: z.array(z.strictObject(scopeEntryShape)),
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('scope-inventory-rejected'),
    reason: z.literal('target-unavailable'),
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('scope-toggle-complete'),
    scopeProjectionRevision: nonnegativeIntegerSchema,
    ...scopeEntryShape,
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('scope-toggle-rejected'),
    ...scopeEntryShape,
    reason: z.enum(['target-unavailable', 'toggle-unavailable']),
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('scope-persist-complete'),
    ...scopeEntryShape,
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('interaction-complete'),
    interaction: z.enum(['pan', 'zoom', 'drag', 'burst']),
    durationMs: nonnegativeFiniteNumberSchema,
  }),
  z.strictObject({
    ...perfEventContextShape,
    kind: z.literal('idle-complete'),
    durationMs: nonnegativeFiniteNumberSchema,
  }),
  metricEventSchema,
]);

export const perfEventMessageSchema = z.strictObject({
  type: z.literal('PERF_EVENT'),
  payload: perfEventPayloadSchema,
});

export type PerfScenario = z.infer<typeof perfScenarioSchema>;
export type PerfOperation = z.infer<typeof perfOperationSchema>;
export type PerfControlMessage = z.infer<typeof perfControlMessageSchema>;
export type PerfEventPayload = z.infer<typeof perfEventPayloadSchema>;
export type PerfEventMessage = z.infer<typeof perfEventMessageSchema>;
export type PerfScopeEntry = z.infer<z.ZodObject<typeof scopeEntryShape>>;
export type PerfScopeVisibilitySnapshot = z.infer<
  typeof perfScopeVisibilitySnapshotSchema
>;
export type PerfRenderReadyRequestMessage = z.infer<
  typeof perfRenderReadyRequestMessageSchema
>;
export type PerfRenderReadyMessage = z.infer<
  typeof perfRenderReadyMessageSchema
>;

type WithoutOperationContext<Event> = Event extends PerfEventPayload
  ? Event extends { kind: 'metric'; metric: 'scopeToggleMs' }
    ? Omit<Event, keyof PerfOperation> & { dimension: string }
    : Omit<Event, keyof PerfOperation>
  : never;

export type PerfEventInput = WithoutOperationContext<PerfEventPayload>;
