import type { IPluginEdgeType } from '@codegraphy-dev/plugin-api';

export const TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE: IPluginEdgeType = {
  id: 'codegraphy.typescript:alias-import',
  label: 'TypeScript Alias Import',
  defaultColor: '#38BDF8',
  defaultVisible: true,
  description: {
    description: 'Shows imports resolved through TypeScript path aliases instead of relative paths.',
    examples: [{ code: 'import { thing } from "@/module";' }],
  },
};
