import { z } from 'zod';

const workspacePathSchema = z.string().trim().min(1);
const pathListPayloadSchema = z.object({
  paths: z.array(workspacePathSchema).min(1),
});

export const clipboardFilesMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('CUT_FILES'), payload: pathListPayloadSchema }),
  z.object({ type: z.literal('COPY_FILES'), payload: pathListPayloadSchema }),
  z.object({
    type: z.literal('PASTE_FILES'),
    payload: z.object({ directory: workspacePathSchema }),
  }),
]);

export type ClipboardFilesMessage = z.infer<typeof clipboardFilesMessageSchema>;
