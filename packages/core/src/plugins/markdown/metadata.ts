import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
} from '../../workspace/settings';

export const CODEGRAPHY_MARKDOWN_PLUGIN_METADATA = {
  packageName: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  name: 'Markdown',
  version: '1.0.0',
  apiVersion: '^4.0.0',
  supportedExtensions: ['*'],
  updateImpact: {
    toggle: 'reanalyze-plugin-files',
    defaultSetting: 'reanalyze-plugin-files',
  },
  disclosures: [],
} as const;
