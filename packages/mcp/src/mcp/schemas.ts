import * as z from 'zod/v4';

const directionSchema = z.enum(['asc', 'desc']).optional();
const sortSchema = z.array(z.object({
  by: z.string(),
  direction: directionSchema,
})).optional();
const filterSchema = z.array(z.object({
  field: z.string(),
  op: z.string(),
  value: z.unknown(),
})).optional();
const scopeSchema = z.object({
  nodes: z.record(z.string(), z.boolean()).optional(),
  edges: z.record(z.string(), z.boolean()).optional(),
}).optional();

export const workspacePathSchema = {
  path: z.string().optional(),
  verboseDiagnostics: z.boolean().optional(),
};

export const packagePluginSchema = {
  ...workspacePathSchema,
  packageName: z.string().min(1),
};

export const pluginActivitySchema = {
  ...workspacePathSchema,
  pluginId: z.string().min(1),
};

export const listQuerySchema = {
  ...workspacePathSchema,
  scope: scopeSchema,
  filters: filterSchema,
  search: z.string().optional(),
  sort: sortSchema,
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional(),
};
