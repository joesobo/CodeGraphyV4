import { z } from 'zod';

const workspacePathSchema = z.string().trim().min(1);

export const fileComparisonMessageSchema = z.object({
  type: z.literal('COMPARE_FILES'),
  payload: z.object({
    leftPath: workspacePathSchema,
    rightPath: workspacePathSchema,
  }),
});

export type FileComparisonMessage = z.infer<typeof fileComparisonMessageSchema>;
